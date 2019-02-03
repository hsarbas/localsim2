import collections
import weakref


class Signal(object):
    """Collects a dictionary of events connected to callbacks, and fires callbacks when prompted."""

    events = None
    __callbacks = None

    def connect(self, event, callback):
        if self.__callbacks is None:
            self.__callbacks = collections.defaultdict(weakref.WeakKeyDictionary)
        if event in self.events:
            if hasattr(callback, 'im_self'):
                weak_key = callback.im_self
                method_name = callback.__name__

                if weak_key not in self.__callbacks[event]:
                    self.__callbacks[event][weak_key] = [method_name]
                elif method_name not in self.__callbacks[event][weak_key]:
                    self.__callbacks[event][weak_key].append(method_name)

            else:
                raise TypeError('Callback not a method of a class')
        else:
            raise ValueError('Unknown event to this signal')

    def connect_to_all(self, callback):
        for event in list(self.events):
            self.connect(event, callback)

    def disconnect(self, event, callback):
        if event in self.events:
            if self.__callbacks:
                if hasattr(callback, 'im_self'):
                    weak_key = callback.im_self
                    method_name = callback.__name__

                    if weak_key in self.__callbacks[event] and method_name in self.__callbacks[event][weak_key]:
                        if len(self.__callbacks[event][weak_key]) == 1:
                            del self.__callbacks[event][weak_key]
                        else:
                            self.__callbacks[event][weak_key].remove(method_name)
                else:
                    raise TypeError('Callback not a method of a class')
        else:
            raise ValueError('Unknown event to this signal')

    def disconnect_to_all(self, callback):
        for event in list(self.events):
            try:
                self.disconnect(event, callback)
            except ValueError:
                pass

    def fire(self, event_, **kwargs):
        if event_ in list(self.events):
            if self.__callbacks:
                for weak_key, method_list in self.__callbacks[event_].items():
                    for m in list(method_list):
                        getattr(weak_key, m)(event_, self, **kwargs)

        else:
            raise ValueError('Unknown event to this signal')


class Clock(Signal):
    """Iterator based on the Signal object; acts as a clock."""

    events = ['fine', 'stop', 'coarse']

    def __init__(self, dt_fine, end=None, dt_coarse=None):
        self.start = 0
        self.end = end

        self.dt_fine = dt_fine
        self.dt_coarse = dt_coarse
        self.now = self.start

    def __iter__(self):
        return self

    def __next__(self):

        if not self.end or self.now <= self.end:
            self.now += self.dt_fine

            if self.dt_coarse and self.now % self.dt_coarse == 0:
                self.fire('coarse', time=self.now)

            self.fire('fine', time=self.now)

            return self.now
        else:
            self.fire('stop')
            raise StopIteration

    def __del__(self):
        self.fire('stop')

    def next(self):
        return self.__next__()

    def __repr__(self):
        return '<{klass}>: Time now is {now}. '.format(klass=self.__class__.__name__, now=self.now)
