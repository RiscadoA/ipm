import json
import sys

# Options
GROUP = "G48"
FILE_NAME = sys.argv[1]

# Open the json file passed as command line argument
with open(FILE_NAME) as json_file:
    data = json.load(json_file)[GROUP]

# Group the data into a dictionary which maps the iteration number to the tests
tests = {}
for test in data:
    test = data[test]
    if test["iteration"] not in tests:
        tests[test["iteration"]] = []
    tests[test["iteration"]].append(test)    

# Collect stats for each iteration:
# - number of tests
# - time per target
# - time per target + penalty
# - misses
# - hits
stats = {}

for i in tests:
    discarded = 0
    stats[i] = {
        "time_per_target": 0,
        "target_w_penalty": 0,
        "misses": 0,
        "hits": 0,
    }

    for test in tests[i]:
        if test["misses"] <= 5:
            stats[i]["time_per_target"] += float(test["time_per_target"])
            stats[i]["target_w_penalty"] += float(test["target_w_penalty"])
            stats[i]["misses"] += float(test["misses"])
            stats[i]["hits"] += float(test["hits"])
        else:
            discarded += 1

    for key in stats[i]:
        stats[i][key] /= len(tests[i]) - discarded
    stats[i]["discarded"] = discarded
    stats[i]["test_count"] = len(tests[i])

# Print the stats
for i in stats:
    print("Iteration: {}".format(i))
    print("Test count: {}".format(stats[i]["test_count"]))
    print("Discarded tests: {}".format(stats[i]["discarded"]))
    print("Time per target: {:.3f}".format(stats[i]["time_per_target"]))
    print("Time per target + penalty: {:.3f}".format(stats[i]["target_w_penalty"]))
    print("Misses: {:.3f}".format(stats[i]["misses"]))
    print("Hits: {:.3f}".format(stats[i]["hits"]))
    print("")

