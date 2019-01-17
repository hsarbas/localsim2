import weakref
import datetime
import time


def epoch(last_issued_id, length=20):
    epoch_ = datetime.datetime.utcfromtimestamp(0)
    delta = datetime.datetime.now() - epoch_

    significance = 10 ** length
    d = delta.total_seconds() * significance

    ret = int(d)

    if ret == last_issued_id:
        time.sleep(0.002)
        return epoch(length)
    else:
        return ret


def weak(last_issued_id):
    return last_issued_id + 1


class ID(object):

    MODE = dict(epoch=epoch, weak=weak)

    def __init__(self, mode='epoch'):
        if mode in ID.MODE:
            self.create_id = ID.MODE[mode]
        else:
            raise ValueError('unknown mode')

        self.objs = weakref.WeakKeyDictionary()
        self.last_issued_id = 0

    def __get__(self, instance, owner):
        if instance:
            if instance not in self.objs.keys():
                self.last_issued_id = self.objs[instance] = self.create_id(self.last_issued_id)
            return self.objs[instance]
        else:
            return self

    def __set__(self, instance, value):
        if instance:
            if instance not in self.objs.keys():
                if value not in self.objs.values():
                    self.objs[instance] = value
                else:
                    raise ValueError('given value for ID is not unique')
            else:
                raise AttributeError('cannot override given ID')
        else:
            raise AttributeError

    def __delete__(self, instance):
        self.objs.pop(instance, None)
