#!/bin/bash

all_points=("D" "T" "F" "DT" "TF" "DF" "DTF" "PM")

for point in "${all_points[@]}"
do
    # Run the python script
    if [ "$point" = "PM" ]; then
        python localsim/test_case_run.py 900 1800 10 old $point _randstringblah
    else
        python localsim/test_case_run.py 900 1800 10 new $point _randstringblah
    fi
    echo "Done with point ${point}"
done

echo "All done"
