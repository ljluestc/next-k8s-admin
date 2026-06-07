package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"regexp"
	"strings"
	"time"
)

type client struct {
	baseURL string
	http    *http.Client
}

type userProfile struct {
	Username string `json:"username"`
}

type dashboardSummary struct {
	ClusterCount      int `json:"clusterCount"`
	PodCount          int `json:"podCount"`
	DeploymentCount   int `json:"deploymentCount"`
	TodayReleaseCount int `json:"todayReleaseCount"`
}

type clusterSummary struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type clusterTestResponse struct {
	Success bool   `json:"success"`
	Version string `json:"version"`
	Error   string `json:"error"`
}

func newClient(baseURL string) (*client, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	return &client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http: &http.Client{
			Jar:     jar,
			Timeout: 20 * time.Second,
		},
	}, nil
}

func (c *client) do(method, path string, payload any, out any, allowedStatus ...int) (int, error) {
	allowed := map[int]struct{}{}
	for _, status := range allowedStatus {
		allowed[status] = struct{}{}
	}

	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return 0, err
		}
		body = bytes.NewBuffer(raw)
	}

	req, err := http.NewRequest(method, c.baseURL+path, body)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, err
	}

	if out != nil && len(rawBody) > 0 {
		if err := json.Unmarshal(rawBody, out); err != nil {
			return resp.StatusCode, err
		}
	}

	if resp.StatusCode >= 400 {
		if _, ok := allowed[resp.StatusCode]; !ok {
			return resp.StatusCode, fmt.Errorf("http %d: %s", resp.StatusCode, string(rawBody))
		}
	}

	return resp.StatusCode, nil
}

func resolvePassword(password, passwordEnv string) (string, error) {
	if password != "" {
		return password, nil
	}
	if passwordEnv != "" {
		value := os.Getenv(passwordEnv)
		if value != "" {
			return value, nil
		}
		return "", fmt.Errorf("environment variable %s is empty", passwordEnv)
	}
	return "", errors.New("password is required (--password or --password-env)")
}

func retry(action string, maxRetries int, retryInterval time.Duration, fn func() error) error {
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if err := fn(); err != nil {
			if attempt == maxRetries {
				return fmt.Errorf("%s failed after %d attempts: %w", action, attempt, err)
			}
			fmt.Fprintf(os.Stderr, "%s attempt %d/%d failed: %v; retrying in %s\n", action, attempt, maxRetries, err, retryInterval)
			time.Sleep(retryInterval)
			continue
		}
		return nil
	}
	return fmt.Errorf("%s failed", action)
}

func extractAPIServerURL(kubeconfig string) (string, error) {
	re := regexp.MustCompile(`(?m)^\s*server:\s*(\S+)\s*$`)
	matches := re.FindStringSubmatch(kubeconfig)
	if len(matches) < 2 {
		return "", errors.New("kubeconfig does not contain a server field")
	}
	return matches[1], nil
}

func main() {
	baseURL := flag.String("base-url", "http://127.0.0.1:3002", "admin base url")
	username := flag.String("username", "admin", "login username")
	password := flag.String("password", "", "login password")
	passwordEnv := flag.String("password-env", "", "environment variable name containing login password")

	upsertCluster := flag.Bool("upsert-cluster", false, "upsert cluster using /api/clusters then optional /api/clusters/{id}/test")
	clusterName := flag.String("cluster-name", "", "cluster unique name")
	clusterDisplayName := flag.String("cluster-display-name", "", "cluster display name")
	clusterDescription := flag.String("cluster-description", "Managed by Terraform API workflow", "cluster description used in upsert payload")
	kubeconfigPath := flag.String("kubeconfig", "", "path to kubeconfig file")
	apiServerURL := flag.String("api-server-url", "", "optional API server URL override; inferred from kubeconfig when empty")
	testCluster := flag.Bool("test-cluster", false, "run /api/clusters/{id}/test after upsert")

	maxRetries := flag.Int("max-retries", 30, "maximum retry count for login and optional connectivity tests")
	retryIntervalSeconds := flag.Int("retry-interval-seconds", 2, "retry interval in seconds")
	skipDashboard := flag.Bool("skip-dashboard", false, "skip /api/dashboard verification")
	flag.Parse()

	if *maxRetries <= 0 {
		fmt.Fprintln(os.Stderr, "ERROR: --max-retries must be > 0")
		os.Exit(1)
	}
	if *retryIntervalSeconds <= 0 {
		fmt.Fprintln(os.Stderr, "ERROR: --retry-interval-seconds must be > 0")
		os.Exit(1)
	}
	if *upsertCluster && (*clusterName == "" || *clusterDisplayName == "" || *kubeconfigPath == "") {
		fmt.Fprintln(os.Stderr, "ERROR: --upsert-cluster requires --cluster-name, --cluster-display-name and --kubeconfig")
		os.Exit(1)
	}

	resolvedPassword, err := resolvePassword(*password, *passwordEnv)
	if err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}

	c, err := newClient(*baseURL)
	if err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}

	retryInterval := time.Duration(*retryIntervalSeconds) * time.Second
	loginReq := map[string]string{"username": *username, "password": resolvedPassword}
	if err := retry("login", *maxRetries, retryInterval, func() error {
		_, err := c.do(http.MethodPost, "/api/auth/login", loginReq, nil)
		return err
	}); err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}

	var me userProfile
	if _, err := c.do(http.MethodGet, "/api/auth/me", nil, &me); err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}
	fmt.Println("login_user:", me.Username)

	if *upsertCluster {
		kubeconfigContentBytes, err := os.ReadFile(*kubeconfigPath)
		if err != nil {
			fmt.Fprintln(os.Stderr, "ERROR:", err)
			os.Exit(1)
		}
		kubeconfigContent := string(kubeconfigContentBytes)
		resolvedAPIServerURL := strings.TrimSpace(*apiServerURL)
		if resolvedAPIServerURL == "" {
			resolvedAPIServerURL, err = extractAPIServerURL(kubeconfigContent)
			if err != nil {
				fmt.Fprintln(os.Stderr, "ERROR:", err)
				os.Exit(1)
			}
		}

		var clusterList []clusterSummary
		if _, err := c.do(http.MethodGet, "/api/clusters", nil, &clusterList); err != nil {
			fmt.Fprintln(os.Stderr, "ERROR:", err)
			os.Exit(1)
		}

		clusterPayload := map[string]any{
			"displayName":   *clusterDisplayName,
			"apiServerUrl":  resolvedAPIServerURL,
			"authType":      "kubeconfig",
			"kubeconfig":    kubeconfigContent,
			"description":   *clusterDescription,
			"notifyEnabled": false,
		}

		clusterID := ""
		upsertResult := ""
		for _, item := range clusterList {
			if item.Name == *clusterName {
				clusterID = item.ID
				break
			}
		}

		if clusterID == "" {
			createPayload := map[string]any{
				"name": *clusterName,
			}
			for k, v := range clusterPayload {
				createPayload[k] = v
			}
			var created clusterSummary
			if _, err := c.do(http.MethodPost, "/api/clusters", createPayload, &created); err != nil {
				fmt.Fprintln(os.Stderr, "ERROR:", err)
				os.Exit(1)
			}
			if created.ID == "" {
				fmt.Fprintln(os.Stderr, "ERROR: cluster create response missing id")
				os.Exit(1)
			}
			clusterID = created.ID
			upsertResult = "created"
		} else {
			var updated clusterSummary
			if _, err := c.do(http.MethodPut, fmt.Sprintf("/api/clusters/%s", clusterID), clusterPayload, &updated); err != nil {
				fmt.Fprintln(os.Stderr, "ERROR:", err)
				os.Exit(1)
			}
			if updated.ID != "" {
				clusterID = updated.ID
			}
			upsertResult = "updated"
		}

		fmt.Println("cluster_upsert_result:", upsertResult)
		fmt.Println("cluster_id:", clusterID)

		if *testCluster {
			testVersion := ""
			err := retry("cluster connectivity test", *maxRetries, retryInterval, func() error {
				var resp clusterTestResponse
				status, err := c.do(
					http.MethodPost,
					fmt.Sprintf("/api/clusters/%s/test", clusterID),
					nil,
					&resp,
					http.StatusBadRequest,
				)
				if err != nil {
					return err
				}
				if status == http.StatusOK && resp.Success {
					testVersion = resp.Version
					return nil
				}
				if resp.Error != "" {
					return errors.New(resp.Error)
				}
				return errors.New("connectivity test returned success=false")
			})
			if err != nil {
				fmt.Fprintln(os.Stderr, "ERROR:", err)
				os.Exit(1)
			}
			fmt.Println("cluster_test_success:", true)
			fmt.Println("cluster_test_version:", testVersion)
		}
	}

	if !*skipDashboard {
		var dashboard dashboardSummary
		if _, err := c.do(http.MethodGet, "/api/dashboard", nil, &dashboard); err != nil {
			fmt.Fprintln(os.Stderr, "ERROR:", err)
			os.Exit(1)
		}
		fmt.Println("cluster_count:", dashboard.ClusterCount)
		fmt.Println("pod_count:", dashboard.PodCount)
		fmt.Println("deployment_count:", dashboard.DeploymentCount)
		fmt.Println("today_release_count:", dashboard.TodayReleaseCount)
	}

	var clusters []clusterSummary
	if _, err := c.do(http.MethodGet, "/api/clusters", nil, &clusters); err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}
	fmt.Println("clusters_returned:", len(clusters))
}
