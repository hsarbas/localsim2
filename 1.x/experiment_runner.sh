#!/bin/bash

all_points=("D" "T" "F" "DT" "TF" "DF" "DTF" "PM")

for point in "${all_points[@]}"
do
    # Run the python script
    if [ "$point" = "PM" ]; then
        python localsim/test_case_run.py 450 450 10 old $point
        python localsim/test_case_run.py 900 900 10 old $point
        python localsim/test_case_run.py 450 900 10 old $point
        python localsim/test_case_run.py 900 1800 10 old $point
    else
        python localsim/test_case_run.py 450 450 10 new $point
        python localsim/test_case_run.py 900 900 10 new $point
        python localsim/test_case_run.py 450 900 10 new $point
        python localsim/test_case_run.py 900 1800 10 new $point
    fi
    echo "\n\n~~~ Done with point ${point}! ~~~\n\n"
done

echo "All done"
