from localsim.serialization.errors import InvalidIDError, MissingReferenceError, UndecodedReferenceError
from const import UNSERIALIZED
import itertools


id_counter = itertools.count().next
_ = id_counter()  # throw first 0


class SerializedObject(object):
    cache = {}

    def __init__(self, obj, encoder, cached=True):
        self._obj = obj
        self.encoder = encoder
        self.cached = cached

    def hint(self):
        return '.'.join([self._obj.__class__.__module__, self._obj.__class__.__name__, ])

    def partial(self):
        o = self._obj.deconstruct()
        return [self.id] + self._inspect_elements(o)

    def encode(self):
        return self.encoder.encode_row(self.partial())

    def _inspect_elements(self, o):
        if isinstance(o, (list, tuple, set)):
            return [self._inspect_elements(e) for e in o]
        elif isinstance(o, dict):
            if len(o) > 0:
                keys = o.keys()
                vals = self._inspect_elements(o.values())
                return dict(zip(keys, vals))
            else:
                return o
        else:
            s_o = SerializedObject(o, self.encoder)
            if isinstance(s_o, SerializedObject):
                return self.encoder.encode_foreign([s_o.id, s_o.hint()])
            else:
                return s_o

    @classmethod
    def purge(cls):
        cls.cache.clear()

    def __new__(cls, obj, encoder, cached=True):
        if hasattr(obj, 'deconstruct'):
            o = object.__new__(cls, obj, encoder)

            if obj in cls.cache:
                setattr(o, 'id', cls.cache[obj])
            else:
                id_ = cls._id_resolver()
                setattr(o, 'id', id_)

                if cached:
                    cls.cache[obj] = id_
            return o
        else:
            return obj

    @classmethod
    def _id_resolver(cls):
        if hasattr(cls, 'id_issuer'):
            id_ = cls.id_issuer()
        else:
            id_ = id_counter()

        if not id_:
            raise InvalidIDError
        return id_


def class_loader(class_path, delimiter='.'):
    tokens = class_path.split(delimiter)

    module = __import__(delimiter.join(tokens[:-1]), fromlist=[tokens[-1]])
    class_ = getattr(module, tokens[-1])

    return class_


class DeserializedObject(object):
    cache = {}

    def __init__(self, obj, decoder, cached=True):
        self._obj = obj
        self.decoder = decoder
        self.cached = cached

    def partial(self):
        return self._inspect_elements(self._obj)

    def decode(self):
        _, _, fullpath, args, kwargs = self.partial()

        if self._all_foreign_loaded(args) and self._all_foreign_loaded(kwargs):
            pass

        class_ = class_loader(fullpath)
        obj = class_(*args, **kwargs)

        DeserializedObject.cache[self.id] = obj
        return obj

    def _inspect_elements(self, o):
        if self.decoder.decode_foreign(o) is not None:
            return DeserializedObject(o, self.decoder)
        elif isinstance(o, (list, tuple, set)):
            return [self._inspect_elements(e) for e in o]
        elif isinstance(o, dict):
            if len(o) > 0:
                keys = o.keys()
                vals = self._inspect_elements(o.values())
                return dict(zip(keys, vals))
            else:
                return o
        else:
            return o

    def _all_foreign_loaded(self, o):
        if self.decoder.decode_foreign(o) is not None:
            id_, path = self.decoder.decode_foreign(o)
            raise UndecodedReferenceError('%s object with id=%s has not been decoded yet.' % (path, id_))
        elif isinstance(o, (list, tuple, set)):
            return all([self._all_foreign_loaded(e) for e in o])
        elif isinstance(o, dict):
            return self._all_foreign_loaded(o.values())
        else:
            return True

    @classmethod
    def purge(cls):
        cls.cache.clear()

    def __new__(cls, obj, decoder, cached=True):
        if isinstance(obj, list) and len(obj) > 0 and obj[0] == UNSERIALIZED:
            o = object.__new__(cls, obj[2:], decoder)

            obj_id = obj[1]
            if not obj_id:
                raise InvalidIDError
            setattr(o, 'id', obj_id)

            if cached and (obj_id not in cls.cache):
                cls.cache[obj_id] = None

            return o

        elif decoder.decode_foreign(obj) is not None:
            obj_id, obj_path = decoder.decode_foreign(obj)

            if obj_id not in cls.cache:
                raise MissingReferenceError('Cannot find %s object with id=%s' % (obj_path, obj_id))
            elif cls.cache[obj_id] is None:
                return obj
            else:
                return cls.cache[obj_id]

        return obj
