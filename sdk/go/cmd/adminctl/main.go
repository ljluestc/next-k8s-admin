package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/twwch/k8s-admin/sdk/go/client"
)

func main() {
	baseURL := flag.String("base-url", "http://localhost:3000", "K8s admin base URL")
	username := flag.String("username", "admin", "Login username")
	password := flag.String("password", "change-me", "Login password")
	flag.Parse()

	api, err := client.New(*baseURL, 30*time.Second)
	if err != nil {
		log.Fatalf("create client: %v", err)
	}

	ctx := context.Background()
	login, err := api.Login(ctx, *username, *password)
	if err != nil {
		log.Fatalf("login failed: %v", err)
	}
	fmt.Printf("mustChangePassword=%v\n", login.MustChangePassword)

	me, err := api.Me(ctx)
	if err != nil {
		log.Fatalf("whoami failed: %v", err)
	}
	fmt.Printf("user=%s superAdmin=%v\n", me.Username, me.IsSuperAdmin)

	dashboard, err := api.Dashboard(ctx, "")
	if err != nil {
		log.Fatalf("dashboard failed: %v", err)
	}
	fmt.Printf("todayReleaseCount=%d deployments=%d pods=%d\n", dashboard.TodayReleaseCount, dashboard.DeploymentCount, dashboard.PodCount)

	releases, err := api.ListReleases(ctx, "", 1, 10)
	if err != nil {
		log.Fatalf("list releases failed: %v", err)
	}
	fmt.Printf("releaseCount(page1)=%d\n", len(releases))
}
