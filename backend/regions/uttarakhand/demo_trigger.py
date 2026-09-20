from score_route_feasibility import set_verification, score_routes, print_report

set_verification("Gaurikund", "Guptkashi", "verified_blocked", "Drone footage: bridge on Guptkashi route flooded, impassable")

df = score_routes()
print_report(df)