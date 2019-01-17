""""
WARNING: DO NOT DEPLOY TO SERVER UNTIL TODO's/ FIXME's
         RELATING TO SECURITY ARE RESOLVED.
"""
import os
import sys
import time
import pickle
from localsim import simulator as sim
from BaseHTTPServer import HTTPServer
from SocketServer import ThreadingMixIn
from localsim.simrequesthandler import SimRequestHandler

from PySide2.QtWidgets import *
from PySide2.QtCore import *
from PySide2.QtGui import *

if os.name != 'posix':
    import _winreg as wreg


class Main(object):
    def __init__(self, port_):
        self.port = port_
        self.running = None
        self.off_sim = sim.Simulator()
        up = os.path.dirname
        p = os.path.join(up(up(__file__)), 'tmp')

        if not os.path.exists(p):
            os.makedirs(p)

        print 'Server is running at port: %s' % self.port

    def run(self):
        httpd = CheatMultipleRequestServer(('', self.port), SimRequestHandler)

        print 'Server ready for http requests!'

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print 'Server shutting down!'
            httpd.socket.close()
            sys.exit()

    # NOTE: use the run function below if CheatMultipleRequestServer fails to handle ANY client
    # def run(self):
    #     httpd = HTTPServer(('', self.port), SimRequestHandler)
    #     print 'Server ready for http requests!'
    #
    #     try:
    #         httpd.serve_forever()
    #     except KeyboardInterrupt:
    #         print 'Server shutting down!'
    #         httpd.socket.close()


class WorkerThread(QThread):
    def __init__(self, port_):
        super(WorkerThread, self).__init__(parent=None)
        self.port = port_
        self.httpd = None

    def run(self):
        try:
            self.httpd = CheatMultipleRequestServer(('', self.port), SimRequestHandler)
            self.httpd.serve_forever()

        except Exception:
            pass

    def stop(self):
        try:
            self.httpd.shutdown()
            self.httpd.socket.close()
            self.httpd = None

        except Exception:
            pass


class Main2(QMainWindow):
    def __init__(self, port_):
        super(Main2, self).__init__(parent=None)
        self.setWindowTitle('LocalSIM')

        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        title_label = QLabel('LocalSIM traffic simulator local server', self)

        btns_console_groupbox = QGroupBox(self)
        btns_console_layout = QGridLayout(btns_console_groupbox)

        self.run_btn = QPushButton('Run server', self)
        self.run_btn.clicked.connect(self.run)

        self.stop_btn = QPushButton('Stop server', self)
        self.stop_btn.setEnabled(False)
        self.stop_btn.clicked.connect(self.stop)

        btns_container = QFrame(self)
        btns_layout = QGridLayout(btns_container)
        btns_layout.addWidget(self.run_btn, 0, 0)
        btns_layout.addWidget(self.stop_btn, 0, 1)

        self.server_status = QLabel(self)
        self.server_status.setText('Server status: offline')

        self.console = QTextEdit(self)
        self.console.setEnabled(False)

        console_container = QFrame(self)
        console_container_layout = QGridLayout(console_container)
        console_container_layout.addWidget(self.server_status, 0, 0)
        console_container_layout.addWidget(self.console, 1, 0)

        btns_console_layout.addWidget(btns_container, 0, 0)
        btns_console_layout.addWidget(console_container, 1, 0)

        layout = QGridLayout(central_widget)
        layout.addWidget(title_label, 0, 0)
        layout.addWidget(btns_console_groupbox, 1, 0)

        self.show()

        self.port = port_
        self.running = None
        self.off_sim = sim.Simulator()
        self.worker_thread = WorkerThread(self.port)

        up = os.path.dirname
        p = os.path.join(up(up(__file__)), 'tmp')

        if not os.path.exists(p):
            os.makedirs(p)

    def run(self):
        self.worker_thread.start()

        self.run_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)
        self.server_status.setText('Server status: online')

        self.console.clear()
        self.console.insertPlainText('Server ready for http requests!\n')
        self.console.insertPlainText('Server is running at port: %s\n' % self.port)
        self.console.insertPlainText('Open browser and go to "localhost".\n\n')

    def stop(self):
        self.worker_thread.stop()

        self.off_sim = None
        self.run_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.server_status.setText('Server status: offline')
        self.console.insertPlainText('Server shut down\n')


class WindowsRegistry:
    def __init__(self, path_, write=True):
        self.write = write
        self.path_ = path_
        self._key_id = str(os.path.join('Software', os.sep, self.path_))
        self._key_id = r'Software\%s' % self.path_

        try:
            self.key = wreg.OpenKey(wreg.HKEY_CURRENT_USER, self._key_id)
        except WindowsError:
            if write:
                self.key = wreg.CreateKey(wreg.HKEY_CURRENT_USER, self._key_id)

    def _set(self, name, value):
        if not self.write:
            raise IOError
        wreg.SetValue(self.key, name, wreg.REG_SZ, str(value))

    def pset(self, name, value):
        self._set(name, pickle.dumps(value))

    def _get(self, name):
        return wreg.QueryValue(self.key, name)

    def pget(self, name):
        return pickle.loads(self._get(name))

    def close(self):
        self.key.Close()

    def __del__(self):
        self.close()


class CheatMultipleRequestServer(ThreadingMixIn, HTTPServer):
    # This class 'should' handle multiple server requests
    pass


if __name__ == '__main__':

    # Note 1: time.localtime(time.time()) returns a 9-tuple data that displays info about current time
    #         The 7th tuple contains the current day of the year (0 to 365-366)
    # if os.name != 'posix':
    #     port = 80
    #     reg = WindowsRegistry('LocalSim', write=True)
    #     chk = None
    #     time_ = None
    #     try:
    #         chk = reg.pget('is_open')
    #     except WindowsError:
    #         reg.pset('is_open', 'True')
    #
    #     try:
    #         time_ = reg.pget('open_time')
    #     except WindowsError:
    #         localtime = time.localtime(time.time())[7]
    #         # print 'Day of the year this program was first opened: %s' % localtime
    #         reg.pset('open_time', str(localtime))
    #         time_ = localtime
    #
    #     if len(sys.argv) > 1:
    #         try:
    #             port = int(sys.argv[1])
    #         except ValueError:
    #             print 'Invalid arguments!\n'
    #             sys.exit()
    #
    #     currtime = time.localtime(time.time())[7]
    #     # print 'Current day: %s' % currtime
    #     if int(currtime) < int(time_) + 9999:
    #         # main = Main(port)
    #         # main.run()
    #         pass
    #     else:
    #         print 'Trial Version expired!'
    #         sys.exit()
    #
    # else:
    #     port = 80
    #     if len(sys.argv) > 1:
    #         try:
    #             port = int(sys.argv[1])
    #         except ValueError:
    #             print 'Invalid arguments!\n'
    #             sys.exit()

    port = 80
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print 'Invalid arguments!\n'
            sys.exit()

    app = QApplication(sys.argv)
    app.setStyle('fusion')
    _ = Main2(port)
    sys.exit(app.exec_())

# if __name__ == '__main__':
#     # Note 1: time.localtime(time.time()) returns a 9-tuple data that displays info about current time
#     #         The 7th tuple contains the current day of the year (0 to 365-366)
#     if os.name != 'posix':
#         port = 80
#         reg = WindowsRegistry('LocalSim', write=True)
#         chk = None
#         time_ = None
#         try:
#             chk = reg.pget('is_open')
#         except WindowsError:
#             reg.pset('is_open', 'True')
#
#         try:
#             time_ = reg.pget('open_time')
#         except WindowsError:
#             localtime = time.localtime(time.time())[7]
#             # print 'Day of the year this program was first opened: %s' % localtime
#             reg.pset('open_time', str(localtime))
#             time_ = localtime
#
#         if len(sys.argv) > 1:
#             try:
#                 port = int(sys.argv[1])
#             except ValueError:
#                 print 'Invalid arguments!\n'
#                 sys.exit()
#
#         currtime = time.localtime(time.time())[7]
#         # print 'Current day: %s' % currtime
#         if int(currtime) < int(time_) + 9999:
#             main = Main(port)
#             main.run()
#         else:
#             print 'Trial Version expired!'
#             sys.exit()
#
#     else:
#         port = 80
#         if len(sys.argv) > 1:
#             try:
#                 port = int(sys.argv[1])
#             except ValueError:
#                 print 'Invalid arguments!\n'
#                 sys.exit()
#
#         # main = Main(port)
#         main = Main2(port)
#         main.run()
