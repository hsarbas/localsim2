from abc import ABCMeta, abstractmethod


class Encoder(object):
    __metaclass__ = ABCMeta

    @staticmethod
    @abstractmethod
    def encode_row(dec_row):
        pass

    @staticmethod
    @abstractmethod
    def encode_foreign(o):
        pass

    @staticmethod
    @abstractmethod
    def build(enc_rows):
        pass

    @staticmethod
    @abstractmethod
    def save(filename, obj, **extras):
        pass

    def __new__(cls, *args, **kwargs):
        raise Exception


class Decoder(object):
    __metaclass__ = ABCMeta

    @staticmethod
    @abstractmethod
    def decode_row(enc_row):
        pass

    @staticmethod
    @abstractmethod
    def decode_foreign(enc_o):
        pass

    @staticmethod
    @abstractmethod
    def unbuild(enc_rows):
        pass

    @staticmethod
    @abstractmethod
    def load(filename, **extras):
        pass

    def __new__(cls, *args, **kwargs):
        raise Exception
