import wrapper
import codec


def serialize(objs, encoder, filename, cached=True):
    encoded = [wrapper.SerializedObject(o, encoder, cached=cached).encode() for o in objs]
    built = encoder.build(encoded)
    encoder.save(filename, built)


def deserialize(decoder, filename, cached=True):
    encoded = decoder.load(filename)
    unbuilt = decoder.unbuild(encoded)
    objs = [wrapper.DeserializedObject(decoder.decode_row(s), decoder, cached=True).decode() for s in unbuilt]

    return objs


def purge_cache():
    wrapper.SerializedObject.purge()
    wrapper.DeserializedObject.purge()


def serial_cache():
    return wrapper.SerializedObject.cache


def deserial_cache():
    return wrapper.DeserializedObject.cache
