import zipfile
import simulator as sim
import json
from BaseHTTPServer import BaseHTTPRequestHandler
from os import path, remove, getcwd, chdir, makedirs, sep
from localsim.models import scene
from localsim.utils import tools
from zipfile import BadZipfile
from localsim.errors import InvalidAccess, InvalidMimeType
from threading import Thread, Lock
import time as t_
import sys
import sqlite3

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


class SimRequestHandler(BaseHTTPRequestHandler):
    """Handles HTTP requests from the browser meant for the simulator."""

    def __init__(self, *args):
        BaseHTTPRequestHandler.__init__(self, *args)
        self.off_sim = sim.Simulator()

        db = sqlite3.connect('server.db')
        conn = db.cursor()
        conn.execute('''CREATE TABLE IF NOT EXISTS users(
                        email TEXT PRIMARY KEY NOT NULL UNIQUE,
                        pw TEXT NOT NULL
                      );''')
        db.commit()
        db.close()

    @staticmethod
    def _valid_file(path_, **kwargs):
        web_path = path.join(getcwd(), 'localsim-web')
        server_path = path.join(getcwd(), 'localsim')
        result = None

        try:
            temps = kwargs['temp']
        except KeyError:
            temps = []

        # http://address.com/ or http://address.com/index.html
        if path_ in ['/', '/index.html']:
            result = path.join(web_path, 'view', 'html', 'index.html')

        # http://address.com/ or http://address.com/login.html
        elif path_ in ['/login.html']:
            result = path.join(web_path, 'view', 'html', 'login.html')

        # http://address.com/main.html
        elif path_ in ['/main.html']:
            result = path.join(web_path, 'view', 'html', 'main.html')

        # js/css files located in view/bootstrap/, views/js/, views/drawables
        elif path_ in ['bootstrap', 'js', 'drawables']:
            result = path.join(web_path, 'view', *temps)

        # html files located in view/html/
        elif path_ in ['modals', 'rc_menu.html']:
            result = path.join(web_path, 'view', 'html', *temps)

        # javascript models here
        elif path_ in ['analysis', 'controller', 'models', 'serializer', 'utils']:
            result = path.join(web_path, *temps)

        #  other files located at localsim/tmp
        elif path_ in ['tmp']:
            result = path.join(getcwd(), *temps)

        # other files located at localsim/temp
        elif path_ in ['temp']:
            result = path.join(getcwd(), *temps)

        return result

    def do_GET(self):

        self.reset_path(getcwd())
        server_path = path.join(getcwd(), 'localsim')
        db = sqlite3.connect('server.db')
        conn = db.cursor()
        _purge = False
        _accept = False
        _fname = ''
        _ftype = '/'
        temp = []

        if self.path != '/':
            _fname = self.path.rsplit('/', 1)[1]
            _ftype = _fname.rsplit('.', 1)[1]
            temp = self.path.split('/')

            path1 = self._valid_file(self.path)
            path2 = self._valid_file(temp[1], temp=temp)
            if temp[1] in ['tmp', 'temp']:
                _purge = True

        else:
            path1 = self._valid_file(self.path)
            path2 = None

        # Check if file exists
        if path1:
            path_ = path1
        elif path2:
            path_ = path2
        else:
            path_ = None

        mimetype = self.content_handler(_ftype)

        try:
            if not mimetype:
                raise InvalidMimeType

            if path_:
                # Open file as binary for non-text mimetypes (eg .lmf, .zip, .png)
                if mimetype.endswith('octet-stream') or mimetype.startswith('image') or mimetype.startswith('video'):
                    webfile = open(path_, 'rb')
                # Open file normally for text mimetypes (eg. .html, .css)
                else:
                    webfile = open(path_, 'r')

                # If valid file, get lock then send data to client
                _client_thread_lock.acquire()
                self.send_response(200)
                self.send_header('Content-type', mimetype)

                if mimetype == 'application/octet-stream':
                    self.send_header('Content-Disposition', 'attachment; filename="%s"' % _fname)

                self.end_headers()
                self.wfile.write(webfile.read())
                webfile.close()

                # Purge necessary files
                if _purge:
                    remove(path_)
                    _purge = False

                # Release lock
                _client_thread_lock.release()

            else:
                raise InvalidAccess

        except (IOError, InvalidMimeType, InvalidAccess) as e:
            print 'Cannot fulfill GET request %s due to error' % path_
            self.send_error(404, 'File not Found')

    def do_POST(self):
        """Handles the POST requests (especially the raw scene data)"""

        global _shared_data
        global result

        runner = SimRunHandler()
        _rootdir = path.dirname(__file__)
        _absfile = path.abspath(__file__)
        up = path.dirname
        raw_head = str(self.headers)
        status = None
        size = -1
        rand_string = ''
        email, password = None, None

        for i in raw_head.split('\r\n'):
            if i.startswith('Content-Length'):
                size = int(i.split(': ')[1])
        raw = self.rfile.read(size)

        if raw.startswith('---'):
            """
            Handles file loading
            args: sp - web boundary (?)
                  cd - content disposition
                  cl - content type
                  ss - html data separator
                  f - data of file
            """
            try:
                [sp, cd, cl, ss, f] = raw.split('\r\n', 4)
                savefile = path.join(up(_rootdir), 'tmp', cd.split('\"')[3])
                [fi, sp, ss] = f.rsplit('\r\n', 2)
                if not savefile.endswith('.lmf'):
                    raise IOError
                with open(savefile, 'wb') as _wfile:
                    _wfile.write(fi)
                # runner.x_load(savefile)
                runner.x_load(savefile)

            except (ValueError, IOError) as e:
                print 'Load error! %s' % e

        elif raw.startswith('SAVE'):
            head, body = raw.split('\r\n')
            savefile = head.split(' ')[1]
            runner.save(path.join(_absfile.rsplit(sep, 2)[0], 'tmp', savefile), body, 'z')

        elif raw.startswith('RUN'):
            head, body = raw.split('\r\n')
            _, duration, routing_mode, rand_string, animated = head.split(' ')

            runner.rand_string = rand_string
            runner.save(path.join(_absfile.rsplit(sep, 2)[0], 'tmp', 'play%s.lmf' % rand_string), body, 'z')

            if runner.load(path.join(_absfile.rsplit(sep, 2)[0], 'tmp', 'play%s.lmf' % rand_string)):
                remove(path.join(_absfile.rsplit(sep, 2)[0], 'tmp', 'play%s.lmf' % rand_string))

            runner.off_sim.animated = True if animated == 'true' else False
            proc = Thread(target=runner.play, args=(int(duration), routing_mode))
            proc.daemon = True
            proc.start()

        elif raw.startswith('STEP'):
            status, rand_string = raw.split(' ')

        elif raw.startswith('EXT'):
            head, body = raw.split('\r\n')
            savefile = path.join('..', 'tmp', 'result%s.xlsx' % runner.rand_string)

        elif raw.startswith('STOP'):
            status = 'STOP'

        elif raw.startswith('LOGIN'):
            status = 'LOGIN'
            try:
                _, email, password = raw.split(' ')
            except ValueError:
                email, password = None, None

        elif raw.startswith('SIGNUP'):
            status = 'SIGNUP'
            try:
                _, email, password = raw.split(' ')
            except ValueError:
                email, password = None, None

        else:
            raise IOError

        self.send_response(200)
        try:
            if status == 'STEP':
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                _client_thread_lock.acquire()
                _shared_data = json.dumps(result, sort_keys=True)
                self.wfile.write(_shared_data)
                _shared_data = {}
                result = {}
                _client_thread_lock.release()

            elif status == 'STOP':
                # FIXME: stop method does not interrupt simulation due to threading
                runner.stop()

            elif status == 'LOGIN':
                self.send_header('Content-type', 'text/html')
                self.end_headers()

                login_success = self._try_login(email, password)
                if login_success:
                    self.wfile.write('login success')
                else:
                    self.wfile.write('login fail')

            elif status == 'SIGNUP':
                self.send_header('Content-type', 'text/html')
                self.end_headers()

                signup_success = self._sign_up(email, password)
                if signup_success:
                    self.wfile.write('signup success')
                else:
                    self.wfile.write('signup fail')

        except (IOError, BadZipfile, TypeError, ValueError) as e:
            print 'Cannot send file'
            self.send_error(404)

    def _try_login(self, email_, password_):

        values = (email_, password_)

        conn = sqlite3.connect('server.db')
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE email=? AND pw=?', values)

        existing = cursor.fetchone()
        conn.close()

        if existing:

            return True
        else:
            return False

    def _sign_up(self, email_, password_):
        if email_ and password_:

            values = (email_, password_)

            conn = sqlite3.connect('server.db')
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM users WHERE email=?', (email_, ))

            existing = cursor.fetchone()

            if existing:
                return False
            else:
                cursor.execute('INSERT INTO users VALUES (?, ?)', values)
                conn.commit()
                conn.close()

                return True
        else:
            return False

    @staticmethod
    def content_handler(type_):
        valid_types = {'/': 'text/html',
                       'html': 'text/html',
                       'js': 'application/javascript',
                       'css': 'text/css',
                       'json': 'application/json',
                       'png': 'image/png',
                       'gif': 'image/gif',
                       'jpg': 'image/jpg',
                       'jpeg': 'image/jpg',
                       'ico': 'image/x-icon',
                       'mp4': 'video/mp4',
                       'woff': 'font/woff',
                       'woff2': 'font/woff2',
                       'map': 'application/json',
                       'ttf': 'application/font-snft',
                       'lmf': 'application/octet-stream',
                       'xls': 'application/octet-stream',
                       'txt': 'text/plain'
                       }
        try:
            return valid_types[type_]
        except KeyError:
            return None

    @staticmethod
    def reset_path(path_):
        while not path_.endswith('1.x'):
            chdir('..')
            path_ = getcwd()


class SimRunHandler(object):
    """Handler object that takes in the data from the client and runs the simulator"""

    def __init__(self):
        self.off_sim = sim.Simulator()
        self.running = None
        self.rand_string = ''

    def reset_map(self):
        self.off_sim.reset()
        self.running = None

    @staticmethod
    def save(filename, raw_data, mode):
        path_ = path.curdir
        if mode == 'z':
            zip_file = zipfile.ZipFile(filename, 'w')
            savable = raw_data.split(';\n')
            for s in savable:
                try:
                    if not path.exists(path.join(path_, 'tmp')):
                        makedirs(path.join(path_, 'tmp'))

                    key, value = s.split(':', 1)
                    with open(path.join(path_, 'tmp', key + '.json'), 'w') as sfile:
                        sfile.write(value)
                    zip_file.write(_tmp_files[key])
                except (ValueError, IOError):
                    print 'Unable to load file' + _tmp_files[key]
        elif mode == 'p':
            with open(filename, 'wb') as pfile:
                pfile.write(raw_data)

        _remove_tmp_files()

    def load(self, filename):
        """Deserializes the scene from JSON to Scene object"""

        if filename:
            self.reset_map()

            try:
                scene.deserialize(filename, self.off_sim.scene)
                return True

            except (IOError, TypeError, BadZipfile) as e:
                print '_load error', e
                self.off_sim.reset()
                return False

    def x_load(self, filename):
        if filename:
            self.reset_map()

            try:
                scene.x_deserialize(filename)

            except (IOError, TypeError, BadZipfile) as e:
                print 'Load error:', e
                self.off_sim.reset()

    def play(self, duration, routing_mode):
        self.off_sim.simulate(duration, routing_mode)
        self.running = True

        if routing_mode == 'dynamic':
            route_masterlist, valid_od_list = self.off_sim.obtain_route_info()
            self.off_sim.scene.route_masterlist = route_masterlist
            self.off_sim.scene.od_list = valid_od_list
            self.off_sim.scene.set_route()

        self._play()

    def _play(self):
        global result
        result = {}
        if self.running and self.off_sim.simulator:
            try:
                while self.running:
                    temp = self.off_sim.simulator.step()
                    if temp is not None:
                        time, data = temp
                        if self.off_sim.animated:
                            result[str(time)] = data
                        else:
                            result['time'] = int(time / 100)

                        while not _client_thread_lock.acquire(False):
                            t_.sleep(0.1)
                        _client_thread_lock.release()

                        if time % 1000 == 0:
                            # result.clear()
                            print '[No animation] Sim time %d sec' % (time/1000)
                    else:
                        time_elapsed = self.off_sim.clock.end / 100
                        agents = self.off_sim.simulator.agent_counter.result()
                        time_speed, _, _ = self.off_sim.simulator.observer.result()

                        print "Time elapsed: %s" % time_elapsed
                        print "Agents generated: %s" % agents
                        print "Mean speed: %s" % time_speed

                        data = self.off_sim.simulator.data
                        sorted_data = tools.sort_data(data)
                        fname = path.join(path.dirname(__file__), '..', 'tmp',
                                          'result%s.xls' % self.rand_string)
                        tools.export_to_xls(fname, sorted_data)

                        summary = data['Summary']['rows']
                        self.stop()
            except KeyboardInterrupt:
                time_elapsed = self.off_sim.clock.end / 100
                agents = self.off_sim.simulator.agent_counter.result()
                time_speed, _, _ = self.off_sim.simulator.observer.result()

                print "Time elapsed: %s" % time_elapsed
                print "Agents generated: %s" % agents
                print "Mean speed: %s" % time_speed

                data = self.off_sim.simulator.data
                sorted_data = tools.sort_data(data)
                fname = path.join(path.dirname(__file__), '..', 'tmp',
                                  'result%s.xls' % self.rand_string)
                tools.export_to_xls(fname, sorted_data)

                summary = data['Summary']['rows']
                self.stop()
        else:
            time_elapsed = self.off_sim.clock.end / 100
            agents = self.off_sim.simulator.agent_counter.result()
            time_speed, _, _ = self.off_sim.simulator.observer.result()

            print "Time elapsed: %s" % time_elapsed
            print "Agents generated: %s" % agents
            print "Mean speed: %s" % time_speed

            data = self.off_sim.simulator.data
            sorted_data = tools.sort_data(data)
            fname = path.join(path.dirname(__file__), '..', 'tmp', 'result%s.xls' % self.rand_string)
            tools.export_to_xls(fname, sorted_data)

            summary = data['Summary']['rows']
            self.stop()

    def stop(self):
        self.off_sim.simulate(0, None, False)
        self.running = None
