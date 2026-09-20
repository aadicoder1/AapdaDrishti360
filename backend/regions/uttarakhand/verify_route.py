"""
verify_route.py
Phase 5 - Clean interface for setting route verification status.
This is what actually gets triggered during the live demo, instead of
editing score_route_feasibility.py directly.

Usage:
    python verify_route.py --village Gaurikund --site Guptkashi --status verified_blocked --note "Drone footage: bridge flooded"
    python verify_route.py --list
"""

import argparse
from score_route_feasibility import set_verification, load_verification_status, score_routes, print_report


VALID_STATUSES = ["verified_clear", "verified_blocked", "unverified"]


def list_current_status():
    log = load_verification_status()
    if not log:
        print("No verification entries set yet - all routes default to 'unverified'.")
        return
    print("=== Current Route Verification Status ===")
    for key, entry in log.items():
        village, site = key.split("__")
        print(f"  {village} -> {site}: {entry['status'].upper()}")
        print(f"    Note: {entry['note']}")


def main():
    parser = argparse.ArgumentParser(description="Set or view route verification status.")
    parser.add_argument("--village", type=str, help="Village name, e.g. Gaurikund")
    parser.add_argument("--site", type=str, help="Relocation site name, e.g. Guptkashi")
    parser.add_argument("--status", type=str, choices=VALID_STATUSES, help="Verification status to set")
    parser.add_argument("--note", type=str, default="", help="Reason/context for this status (e.g. drone report)")
    parser.add_argument("--list", action="store_true", help="Show all current verification entries")
    parser.add_argument("--rescore", action="store_true", help="Recompute and print feasibility ranking after setting status")

    args = parser.parse_args()

    if args.list:
        list_current_status()
        return

    if not (args.village and args.site and args.status):
        print("Provide --village, --site, and --status to set verification.")
        print("Or use --list to view current status.")
        return

    set_verification(args.village, args.site, args.status, args.note)

    if args.rescore:
        df = score_routes()
        print_report(df)


if __name__ == "__main__":
    main()