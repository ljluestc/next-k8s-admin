#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path
from textwrap import dedent


def write_file(path: Path, content: str, overwrite: bool) -> None:
    if path.exists() and not overwrite:
        raise FileExistsError(f"{path} already exists (use --force to overwrite)")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_chart_yaml(
    app_name: str,
    chart_name: str,
    chart_version: str,
    chart_repository: str,
    alias: str | None,
) -> str:
    dependency_lines = [
        f"  - name: {chart_name}",
        f"    version: {chart_version}",
        f"    repository: {chart_repository}",
    ]
    if alias:
        dependency_lines.append(f"    alias: {alias}")
    dependency = "\n".join(dependency_lines)
    return dedent(
        f"""\
        apiVersion: v2
        name: {app_name}
        version: 1.0.0
        dependencies:
        {dependency}
        """
    )


def build_values_yaml(values_key: str) -> str:
    return f"{values_key}: {{}}\n"


def build_argocd_application_yaml(
    app_name: str,
    repo_url: str,
    target_revision: str,
    namespace: str,
    release_name: str,
    path: str,
) -> str:
    return dedent(
        f"""\
        apiVersion: argoproj.io/v1alpha1
        kind: Application
        metadata:
          name: {app_name}
          namespace: argocd
        spec:
          project: default
          source:
            repoURL: {repo_url}
            targetRevision: {target_revision}
            path: {path}
            helm:
              releaseName: {release_name}
          destination:
            server: https://kubernetes.default.svc
            namespace: {namespace}
          syncPolicy:
            automated:
              prune: true
              selfHeal: true
            syncOptions:
              - CreateNamespace=true
              - ServerSideApply=true
        """
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scaffold a Helm dependency wrapper chart and matching ArgoCD Application YAML."
    )
    parser.add_argument("--app-name", required=True, help="ArgoCD application name")
    parser.add_argument(
        "--chart-name", required=True, help="Upstream Helm chart name (dependency name)"
    )
    parser.add_argument(
        "--chart-version", required=True, help="Upstream Helm chart version"
    )
    parser.add_argument(
        "--chart-repository",
        required=True,
        help="Upstream Helm chart repository URL (supports https:// and oci://)",
    )
    parser.add_argument(
        "--namespace", required=True, help="Kubernetes namespace for destination"
    )
    parser.add_argument(
        "--release-name",
        help="Helm releaseName for ArgoCD source. Defaults to --app-name.",
    )
    parser.add_argument(
        "--dependency-alias",
        help="Optional Helm dependency alias (useful for multiple same chart dependencies).",
    )
    parser.add_argument(
        "--repo-url", required=True, help="Git repository URL used by ArgoCD source.repoURL"
    )
    parser.add_argument(
        "--target-revision",
        required=True,
        help="Git revision used by ArgoCD source.targetRevision",
    )
    parser.add_argument(
        "--apps-root",
        default="deploy/apps",
        help="Root directory where wrapper charts are generated (default: deploy/apps)",
    )
    parser.add_argument(
        "--application-output",
        help="Optional output path for generated ArgoCD Application YAML. If omitted, prints to stdout.",
    )
    parser.add_argument(
        "--force", action="store_true", help="Overwrite existing files when present."
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    app_dir = Path(args.apps_root) / args.app_name
    chart_yaml_path = app_dir / "Chart.yaml"
    values_yaml_path = app_dir / "values.yaml"
    app_path = f"{args.apps_root.rstrip('/')}/{args.app_name}"
    release_name = args.release_name or args.app_name
    values_key = args.dependency_alias or args.chart_name

    chart_yaml = build_chart_yaml(
        app_name=args.app_name,
        chart_name=args.chart_name,
        chart_version=args.chart_version,
        chart_repository=args.chart_repository,
        alias=args.dependency_alias,
    )
    values_yaml = build_values_yaml(values_key)
    app_yaml = build_argocd_application_yaml(
        app_name=args.app_name,
        repo_url=args.repo_url,
        target_revision=args.target_revision,
        namespace=args.namespace,
        release_name=release_name,
        path=app_path,
    )

    write_file(chart_yaml_path, chart_yaml, overwrite=args.force)
    write_file(values_yaml_path, values_yaml, overwrite=args.force)

    if args.application_output:
        write_file(Path(args.application_output), app_yaml, overwrite=args.force)
        print(f"wrote wrapper chart: {chart_yaml_path}")
        print(f"wrote values file:   {values_yaml_path}")
        print(f"wrote app manifest:  {args.application_output}")
    else:
        print(f"wrote wrapper chart: {chart_yaml_path}")
        print(f"wrote values file:   {values_yaml_path}")
        print("---")
        print(app_yaml.rstrip())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
