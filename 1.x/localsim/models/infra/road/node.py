from localsim.utils import signal


class Node(signal.Signal):
    events = ['move', 'destroy']

    def __init__(self, x, y, dir_):
        self._x = x
        self._y = y
        self.dir = dir_

    def deconstruct(self):
        fullpath = '.'.join([self.__class__.__module__, self.__class__.__name__])
        args = [self.x, self.y, self.dir]
        kwargs = {}
        return [fullpath, args, kwargs]

    def __del__(self):
        self.fire('destroy')

    def move(self, x=None, y=None):
        change = False

        if x is not None and x != self._x:
            self._x = x
            change = True

        if y is not None and y != self._y:
            self._y = y
            change = True

        if change:
            self.fire('move')

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def __repr__(self):
        return '<%s: (%s, %s)>' % (self.__class__.__name__, self.x, self.y)
