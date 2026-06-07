from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


class K8sAdminApiError(RuntimeError):
    def __init__(self, status_code: int, payload: Any):
        self.status_code = status_code
        self.payload = payload
        super().__init__(f"K8s Admin API error ({status_code}): {payload}")


@dataclass
class K8sAdminClient:
    base_url: str = "http://localhost:3000"
    timeout_seconds: int = 30

    def __post_init__(self) -> None:
        self.base_url = self.base_url.rstrip("/")
        self._session = requests.Session()

    def _request(self, method: str, path: str, *, params: dict[str, Any] | None = None, body: Any | None = None) -> Any:
        url = f"{self.base_url}{path}"
        response = self._session.request(
            method=method,
            url=url,
            params=params,
            json=body,
            timeout=self.timeout_seconds,
        )
        payload: Any
        try:
            payload = response.json()
        except ValueError:
            payload = response.text
        if response.status_code >= 400:
            raise K8sAdminApiError(response.status_code, payload)
        return payload

    # Auth
    def login(self, username: str, password: str) -> dict[str, Any]:
        return self._request("POST", "/api/auth/login", body={"username": username, "password": password})

    def logout(self) -> dict[str, Any]:
        return self._request("POST", "/api/auth/logout")

    def me(self) -> dict[str, Any]:
        return self._request("GET", "/api/auth/me")

    # Clusters
    def list_clusters(self) -> list[dict[str, Any]]:
        return self._request("GET", "/api/clusters")

    def create_cluster(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/clusters", body=payload)

    def get_cluster(self, cluster_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/clusters/{cluster_id}")

    def update_cluster(self, cluster_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PUT", f"/api/clusters/{cluster_id}", body=payload)

    def delete_cluster(self, cluster_id: str) -> dict[str, Any]:
        return self._request("DELETE", f"/api/clusters/{cluster_id}")

    def test_cluster(self, cluster_id: str) -> dict[str, Any]:
        return self._request("POST", f"/api/clusters/{cluster_id}/test")

    # Dashboard and release views
    def dashboard(self, cluster_id: str | None = None) -> dict[str, Any]:
        params = {"clusterId": cluster_id} if cluster_id else None
        return self._request("GET", "/api/dashboard", params=params)

    def list_releases(
        self,
        *,
        cluster_id: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        if cluster_id:
            params["clusterId"] = cluster_id
        if page is not None:
            params["page"] = page
        if page_size is not None:
            params["pageSize"] = page_size
        return self._request("GET", "/api/apps/releases", params=params or None)

    def platform_panels(self, cluster_id: str | None = None) -> dict[str, Any]:
        params = {"clusterId": cluster_id} if cluster_id else None
        return self._request("GET", "/api/platform-panels", params=params)
