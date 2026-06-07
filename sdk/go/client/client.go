package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"
)

type APIError struct {
	StatusCode int
	Payload    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("k8s admin api error (%d): %s", e.StatusCode, e.Payload)
}

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func New(baseURL string, timeout time.Duration) (*Client, error) {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: timeout,
			Jar:     jar,
		},
	}, nil
}

func (c *Client) doJSON(ctx context.Context, method string, path string, query map[string]string, reqBody any, out any) error {
	fullURL := c.baseURL + path
	parsed, err := url.Parse(fullURL)
	if err != nil {
		return err
	}
	q := parsed.Query()
	for k, v := range query {
		if v != "" {
			q.Set(k, v)
		}
	}
	parsed.RawQuery = q.Encode()

	var body io.Reader
	if reqBody != nil {
		data, err := json.Marshal(reqBody)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, parsed.String(), body)
	if err != nil {
		return err
	}
	if reqBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return &APIError{StatusCode: resp.StatusCode, Payload: string(data)}
	}
	if out == nil || len(data) == 0 {
		return nil
	}
	return json.Unmarshal(data, out)
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	MustChangePassword bool `json:"mustChangePassword"`
}

type UserProfile struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	Email              string `json:"email"`
	MustChangePassword bool   `json:"mustChangePassword"`
	WSToken            string `json:"wsToken"`
	IsSuperAdmin       bool   `json:"isSuperAdmin"`
}

type Cluster struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	DisplayName       string  `json:"displayName"`
	APIServerURL      string  `json:"apiServerUrl"`
	AuthType          string  `json:"authType"`
	Status            string  `json:"status"`
	LastHealthCheckAt *string `json:"lastHealthCheckAt"`
	Description       *string `json:"description"`
	WebhookURL        *string `json:"webhookUrl"`
	NotifyEnabled     bool    `json:"notifyEnabled"`
}

type ClusterTestResponse struct {
	Success bool   `json:"success"`
	Version string `json:"version"`
	Error   string `json:"error"`
}

type DashboardSummary struct {
	ClusterCount      int `json:"clusterCount"`
	PodCount          int `json:"podCount"`
	DeploymentCount   int `json:"deploymentCount"`
	TodayReleaseCount int `json:"todayReleaseCount"`
}

type ReleaseRecord struct {
	ID        string `json:"id"`
	ClusterID string `json:"clusterId"`
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Status    string `json:"status"`
	Revision  int    `json:"revision"`
	Message   string `json:"message"`
	Operator  string `json:"operator"`
}

func (c *Client) Login(ctx context.Context, username string, password string) (*LoginResponse, error) {
	var out LoginResponse
	err := c.doJSON(ctx, http.MethodPost, "/api/auth/login", nil, LoginRequest{Username: username, Password: password}, &out)
	return &out, err
}

func (c *Client) Logout(ctx context.Context) error {
	return c.doJSON(ctx, http.MethodPost, "/api/auth/logout", nil, nil, nil)
}

func (c *Client) Me(ctx context.Context) (*UserProfile, error) {
	var out UserProfile
	err := c.doJSON(ctx, http.MethodGet, "/api/auth/me", nil, nil, &out)
	return &out, err
}

func (c *Client) ListClusters(ctx context.Context) ([]Cluster, error) {
	var out []Cluster
	err := c.doJSON(ctx, http.MethodGet, "/api/clusters", nil, nil, &out)
	return out, err
}

func (c *Client) CreateCluster(ctx context.Context, payload map[string]any) (*Cluster, error) {
	var out Cluster
	err := c.doJSON(ctx, http.MethodPost, "/api/clusters", nil, payload, &out)
	return &out, err
}

func (c *Client) GetCluster(ctx context.Context, clusterID string) (*Cluster, error) {
	var out Cluster
	err := c.doJSON(ctx, http.MethodGet, "/api/clusters/"+clusterID, nil, nil, &out)
	return &out, err
}

func (c *Client) UpdateCluster(ctx context.Context, clusterID string, payload map[string]any) (*Cluster, error) {
	var out Cluster
	err := c.doJSON(ctx, http.MethodPut, "/api/clusters/"+clusterID, nil, payload, &out)
	return &out, err
}

func (c *Client) DeleteCluster(ctx context.Context, clusterID string) error {
	return c.doJSON(ctx, http.MethodDelete, "/api/clusters/"+clusterID, nil, nil, nil)
}

func (c *Client) TestCluster(ctx context.Context, clusterID string) (*ClusterTestResponse, error) {
	var out ClusterTestResponse
	err := c.doJSON(ctx, http.MethodPost, "/api/clusters/"+clusterID+"/test", nil, nil, &out)
	return &out, err
}

func (c *Client) Dashboard(ctx context.Context, clusterID string) (*DashboardSummary, error) {
	query := map[string]string{}
	if clusterID != "" {
		query["clusterId"] = clusterID
	}
	var out DashboardSummary
	err := c.doJSON(ctx, http.MethodGet, "/api/dashboard", query, nil, &out)
	return &out, err
}

func (c *Client) ListReleases(ctx context.Context, clusterID string, page int, pageSize int) ([]ReleaseRecord, error) {
	query := map[string]string{}
	if clusterID != "" {
		query["clusterId"] = clusterID
	}
	if page > 0 {
		query["page"] = fmt.Sprintf("%d", page)
	}
	if pageSize > 0 {
		query["pageSize"] = fmt.Sprintf("%d", pageSize)
	}
	var out []ReleaseRecord
	err := c.doJSON(ctx, http.MethodGet, "/api/apps/releases", query, nil, &out)
	return out, err
}

func (c *Client) PlatformPanels(ctx context.Context, clusterID string) (map[string]any, error) {
	query := map[string]string{}
	if clusterID != "" {
		query["clusterId"] = clusterID
	}
	out := map[string]any{}
	err := c.doJSON(ctx, http.MethodGet, "/api/platform-panels", query, nil, &out)
	return out, err
}
