import zipfile
from zipfile import BadZipfile
import json
from BaseHTTPServer import BaseHTTPRequestHandler
from os import path, remove, getcwd, chdir, makedirs, sep
from threading import Thread, Lock
import time as t_
import sys
import sqlite3

import simulator as sim
from localsim.models import scene
from localsim.utils import tools
from localsim.errors import InvalidAccess, InvalidMimeType

if sys.platform == 'win32':
    from signal import signal, SIG_DFL
else:
    from signal import signal, SIGPIPE, SIG_DFL

if sys.platform != 'win32':
    signal(SIGPIPE, SIG_DFL)

_client_thread_lock = Lock()
_shared_data = {}
_shared_result = {}


_tmp_dir = 'tmp'
_tmp_files = dict(
    node=path.join(_tmp_dir, 'node.json'),
    control=path.join(_tmp_dir, 'control.json'),
    uroad=path.join(_tmp_dir, 'uroad.json'),
    iroad=path.join(_tmp_dir, 'iroad.json'),
    route=path.join(_tmp_dir, 'route.json'),
    data=path.join(_tmp_dir, 'data.json'),
    config=path.join(_tmp_dir, 'config.json'),
    landmark=path.join(_tmp_dir, 'landmark.json'),
    dispatcher=path.join(_tmp_dir, 'dispatcher.json'),
    surveyor=path.join(_tmp_dir, 'surveyor.json'),
    conflict_zone=path.join(_tmp_dir, 'conflict_zone.json')
)


def _remove_tmp_files():
    for f in _tmp_files.values():
        try:
            remove(f)
        except OSError as e:
            print 'Removing tmp files error:', e

