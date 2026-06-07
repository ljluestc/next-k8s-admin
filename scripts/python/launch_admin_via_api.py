#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any, Callable


class AdminApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.cookies = CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def _request(self, method: str, path: str, payload: dict | None = None) -> tuple[int, Any]:
        url = f"{self.base_url}{path}"
        data = None
        headers = {"Content-Type": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, method=method, data=data, headers=headers)
        try:
            with self.opener.open(req, timeout=20) as resp:
                body = resp.read().decode("utf-8")
                if not body:
                    return resp.status, {}
                try:
                    return resp.status, json.loads(body)
                except json.JSONDecodeError:
                    return resp.status, body
        except urllib.error.HTTPError as err:
            raw = err.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = raw
            return err.code, parsed
        except urllib.error.URLError as err:
            raise RuntimeError(f"request failed: {method} {path}: {err.reason}") from err

    def login(self, username: str, password: str) -> None:
        code, body = self._request("POST", "/api/auth/login", {"username": username, "password": password})
        if code != 200:
            raise RuntimeError(f"login failed: {code} {body}")

    def me(self) -> dict:
        code, body = self._request("GET", "/api/auth/me")
        if code != 200:
            raise RuntimeError(f"session validation failed: {code} {body}")
        if not isinstance(body, dict):
            raise RuntimeError("invalid /api/auth/me response type")
        return body

    def dashboard(self) -> dict:
        code, body = self._request("GET", "/api/dashboard")
        if code != 200:
            raise RuntimeError(f"dashboard request failed: {code} {body}")
        if not isinstance(body, dict):
            raise RuntimeError("invalid /api/dashboard response type")
        return body

    def clusters(self) -> list[dict]:
        code, body = self._request("GET", "/api/clusters")
        if code != 200:
            raise RuntimeError(f"clusters request failed: {code} {body}")
        if not isinstance(body, list):
            raise RuntimeError("invalid /api/clusters response type")
        return body

    def upsert_cluster(
        self,
        *,
        name: str,
        display_name: str,
        api_server_url: str,
        kubeconfig: str,
        description: str,
    ) -> tuple[str, str]:
        payload = {
            "displayName": display_name,
            "apiServerUrl": api_server_url,
            "authType": "kubeconfig",
            "kubeconfig": kubeconfig,
            "description": description,
            "notifyEnabled": False,
        }
        existing = next((cluster for cluster in self.clusters() if cluster.get("name") == name), None)
        if existing:
            cluster_id = existing.get("id")
            if not isinstance(cluster_id, str) or not cluster_id:
                raise RuntimeError(f"invalid existing cluster id: {cluster_id}")
            code, body = self._request("PUT", f"/api/clusters/{cluster_id}", payload)
            if code != 200:
                raise RuntimeError(f"cluster update failed: {code} {body}")
            return cluster_id, "updated"

        create_payload = {"name": name, **payload}
        code, body = self._request("POST", "/api/clusters", create_payload)
        if code != 201:
            raise RuntimeError(f"cluster create failed: {code} {body}")
        if not isinstance(body, dict) or not isinstance(body.get("id"), str):
            raise RuntimeError("cluster create response missing id")
        return body["id"], "created"

    def test_cluster(self, cluster_id: str) -> tuple[bool, dict]:
        code, body = self._request("POST", f"/api/clusters/{cluster_id}/test")
        if code == 200 and isinstance(body, dict) and body.get("success") is True:
            return True, body
        if code == 400:
            if isinstance(body, dict):
                return False, body
            return False, {"error": str(body)}
        raise RuntimeError(f"cluster test failed: {code} {body}")


def retry(action_name: str, max_retries: int, retry_interval_seconds: int, fn: Callable[[], Any]) -> Any:
    for attempt in range(1, max_retries + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            if attempt == max_retries:
                raise RuntimeError(f"{action_name} failed after {attempt} attempts: {exc}") from exc
            print(
                f"{action_name} attempt {attempt}/{max_retries} failed: {exc}; retrying in {retry_interval_seconds}s",
                file=sys.stderr,
            )
            time.sleep(retry_interval_seconds)
    raise RuntimeError(f"{action_name} failed")


def extract_api_server_url(kubeconfig_content: str) -> str:
    match = re.search(r"(?m)^\s*server:\s*(\S+)\s*$", kubeconfig_content)
    if not match:
        raise RuntimeError("kubeconfig does not contain a server field")
    return match.group(1)


def resolve_password(password: str | None, password_env: str | None) -> str:
    if password:
        return password
    if password_env:
        env_password = os.getenv(password_env)
        if env_password:
            return env_password
        raise RuntimeError(f"environment variable {password_env} is empty")
    raise RuntimeError("password is required (--password or --password-env)")


def test_cluster_with_retry_error(client: AdminApiClient, cluster_id: str) -> dict:
    success, body = client.test_cluster(cluster_id)
    if success:
        return body
    raise RuntimeError(str(body.get("error", "connectivity test returned success=false")))


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch/verify admin via API")
    parser.add_argument("--base-url", default="http://127.0.0.1:3002")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password")
    parser.add_argument("--password-env", default="")
    parser.add_argument("--upsert-cluster", action="store_true")
    parser.add_argument("--cluster-name")
    parser.add_argument("--cluster-display-name")
    parser.add_argument("--cluster-description", default="Managed by Terraform API workflow")
    parser.add_argument("--kubeconfig")
    parser.add_argument("--api-server-url", default="")
    parser.add_argument("--test-cluster", action="store_true")
    parser.add_argument("--max-retries", type=int, default=30)
    parser.add_argument("--retry-interval-seconds", type=int, default=2)
    parser.add_argument("--skip-dashboard", action="store_true")
    args = parser.parse_args()

    if args.max_retries <= 0:
        raise RuntimeError("--max-retries must be > 0")
    if args.retry_interval_seconds <= 0:
        raise RuntimeError("--retry-interval-seconds must be > 0")
    if args.upsert_cluster and (not args.cluster_name or not args.cluster_display_name or not args.kubeconfig):
        raise RuntimeError("--upsert-cluster requires --cluster-name, --cluster-display-name and --kubeconfig")

    password = resolve_password(args.password, args.password_env)
    client = AdminApiClient(args.base_url)
    retry("login", args.max_retries, args.retry_interval_seconds, lambda: client.login(args.username, password))
    user = client.me()

    print("login_user:", user.get("username"))

    if args.upsert_cluster:
        kubeconfig_content = Path(args.kubeconfig).read_text(encoding="utf-8")
        api_server_url = args.api_server_url or extract_api_server_url(kubeconfig_content)
        cluster_id, upsert_result = client.upsert_cluster(
            name=args.cluster_name,
            display_name=args.cluster_display_name,
            api_server_url=api_server_url,
            kubeconfig=kubeconfig_content,
            description=args.cluster_description,
        )
        print("cluster_upsert_result:", upsert_result)
        print("cluster_id:", cluster_id)

        if args.test_cluster:
            test_body = retry(
                "cluster connectivity test",
                args.max_retries,
                args.retry_interval_seconds,
                lambda: test_cluster_with_retry_error(client, cluster_id),
            )
            print("cluster_test_success:", test_body.get("success"))
            print("cluster_test_version:", test_body.get("version"))

    if not args.skip_dashboard:
        dashboard = client.dashboard()
        print("cluster_count:", dashboard.get("clusterCount"))
        print("pod_count:", dashboard.get("podCount"))
        print("deployment_count:", dashboard.get("deploymentCount"))
        print("today_release_count:", dashboard.get("todayReleaseCount"))

    clusters = client.clusters()
    print("clusters_returned:", len(clusters))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)