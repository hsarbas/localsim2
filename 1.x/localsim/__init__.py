__conf = None


def conf(c=None):
    global __conf

    if c:
        __conf = c
    else:
        if __conf is None:
            import config
            __conf = config.ConfigObject()
    return __conf
