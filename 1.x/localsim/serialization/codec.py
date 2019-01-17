import abscodec
import const
import json


class JSONEncoder(abscodec.Encoder):
    @staticmethod
    def encode_row(dec_row):
        id_, fullpath, args, kwargs = dec_row

        return {
            const.ID: id_,
            const.MODULE: fullpath,
            const.ARGS: args,
            const.KWARGS: kwargs
        }

    @staticmethod
    def build(enc_rows):
        return {const.HEADER: [row for row in enc_rows]}

    @staticmethod
    def encode_foreign(dec_o):
        id_, fullpath = dec_o
        return {const.FOREIGN: True, const.MODULE: fullpath, const.ID: id_}

    @staticmethod
    def save(filename, obj, **extras):
        with open(filename, 'w') as f:
            json.dump(obj, f, indent=4)


class JSONDecoder(abscodec.Decoder):
    @staticmethod
    def decode_row(row):
        return [
            const.UNSERIALIZED, row[const.ID], row[const.MODULE], row[const.ARGS], row[const.KWARGS]
        ]

    @staticmethod
    def decode_foreign(enc_o):
        if isinstance(enc_o, dict) and const.FOREIGN in enc_o:
            return enc_o[const.ID], enc_o[const.MODULE]
        else:
            return None

    @staticmethod
    def unbuild(enc_rows):
        return list(enc_rows[const.HEADER])

    @staticmethod
    def load(filename, **extras):
        with open(filename, 'r') as f:
            data = json.load(f)
        return data
