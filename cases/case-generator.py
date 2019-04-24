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

def _remove_tmp_files():
    for f in _tmp_files.values():
        try:
            os.remove(f)
        except OSError as e:
            print 'Removing tmp files error:', e

### Extract the base map
zip_file = zipfile.ZipFile('tri-leg-loaded.lmf')
zip_file.extractall()

### Process the files
with open(_tmp_files['dispatcher'], 'r+') as f:
    data = json.load(f)
    for dispatcher in data['head']:
        dispatcher['ars'][1]['0,3600'][0] = 1800
        dispatcher['ars'][1]['0,3600'][1] = dispatcher['ars'][1]['0,3600'][1] * 3
    f.seek(0)
    json.dump(data, f, indent=4)
    f.truncate()

### Write to a new output file
output_file = zipfile.ZipFile('tri-leg-overloaded.lmf', 'w')
for f in _tmp_files.iteritems():
    output_file.write(f[1])