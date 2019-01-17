import weakref


class SafeDict(object):
    def __init__(self, *pclass, **kwargs):
        self._storage = dict()
        self._pclass = tuple(pclass)

        for key, value in kwargs.iteritems():
            if isinstance(value, self._pclass):
                self._storage[key] = weakref.ref(value)
            else:
                self._storage[key] = value

    def __getitem__(self, item):
        value = self._storage[item]
        if isinstance(value, weakref.ref):
            return value()
        return value

    def __len__(self):
        return len(self._storage.values())

    def values(self):
        t = []
        for key in self._storage:
            t.append(self.__getitem__(key))
        return t

    def __repr__(self):
        return repr(self._storage)
