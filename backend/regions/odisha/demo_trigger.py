from score_route_feasibility import set_verification, score_routes, print_report

# Simulated: cyclone surge flooded the Bhubaneswar highway approach from Tandahara
set_verification("Tandahara", "Bhubaneswar", "verified_blocked", "Drone footage: NH316 approach flooded near Pipili, impassable")

df = score_routes("Tandahara")
print_report(df, "Tandahara")