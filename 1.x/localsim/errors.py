class InvalidMimeType(Exception):
    def __init__(self):
        Exception.__init__(self, 'Invalid mimetype!')


class InvalidAccess(Exception):
    def __init__(self):
        Exception.__init__(self, 'Access Denied!')