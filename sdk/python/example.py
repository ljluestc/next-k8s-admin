from client import K8sAdminClient, K8sAdminApiError


def main() -> None:
    client = K8sAdminClient(base_url="http://localhost:3000")
    try:
        login = client.login("admin", "change-me")
        print("login:", login)
        me = client.me()
        print("user:", me.get("username"))

        dashboard = client.dashboard()
        print("todayReleaseCount:", dashboard.get("todayReleaseCount"))

        clusters = client.list_clusters()
        print("clusters:", len(clusters))

        releases = client.list_releases(page=1, page_size=10)
        print("releases:", len(releases))
    except K8sAdminApiError as err:
        print(f"API error: status={err.status_code}, payload={err.payload}")


if __name__ == "__main__":
    main()
