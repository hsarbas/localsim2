import zipfile
import json
import os

_tmp_dir = 'tmp'
_tmp_files = dict(
    node=os.path.join(_tmp_dir, 'node.json'),
    control=os.path.join(_tmp_dir, 'control.json'),
    uroad=os.path.join(_tmp_dir, 'uroad.json'),
    iroad=os.path.join(_tmp_dir, 'iroad.json'),
    route=os.path.join(_tmp_dir, 'route.json'),
    data=os.path.join(_tmp_dir, 'data.json'),
    config=os.path.join(_tmp_dir, 'config.json'),
    landmark=os.path.join(_tmp_dir, 'landmark.json'),
    dispatcher=os.path.join(_tmp_dir, 'dispatcher.json'),
    surveyor=os.path.join(_tmp_dir, 'surveyor.json'),
    conflict_zone=os.path.join(_tmp_dir, 'conflict_zone.json')
)

###
# Run this script on this folder ONLY
# The paths will change
###

## Traffic Demand:
## - Symmetric, 450 to 1800
##
## Stoplight cycle:
## - 50 to 300

traffic_demand = range(450,901,50)
stoplight_cycle = range(50,301,50)

def _remove_tmp_files():
    for f in _tmp_files.values():
        try:
            os.remove(f)
        except OSError as e:
            print 'Removing tmp files error:', e

### Extract the base map
## Filename: 4leg-<trafficdemand>-<cycletime>.lmf
zip_file = zipfile.ZipFile('4leg-450-150.lmf')
zip_file.extractall()

### Process the files

for demand in traffic_demand:
    with open(_tmp_files['dispatcher'], 'r+') as f:
        data = json.load(f)
        for dispatcher in data['head']:
            scaleby = float(demand) / dispatcher['ars'][1]['0,3600'][0]
            dispatcher['ars'][1]['0,3600'][0] = demand
            dispatcher['ars'][1]['0,3600'][1] = dispatcher['ars'][1]['0,3600'][1] * scaleby
        f.seek(0)
        json.dump(data, f, indent=4)
        f.truncate()

    ### Write to a new output file
    output_file = zipfile.ZipFile('4leg-{}-150.lmf'.format(demand), 'w')
    for f in _tmp_files.iteritems():
        output_file.write(f[1])