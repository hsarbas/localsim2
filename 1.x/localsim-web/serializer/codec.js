/**
 * Created by Chris on 6/6/2017.
 */

class JSONEncoder{

    static encode_raw(raw_data){
        // Encodes raw data to json format
        let id_ = raw_data[0];
        let cls = raw_data[1];
        let args = raw_data[2];
        let kwargs = raw_data[3];

        return {
            "id": id_,
            "cls": cls,
            "ars": args,
            "kws": kwargs
        }
    }

    static encode_foreign(raw){
        let _id = raw[0];
        let _cls = raw[1];

        return {"__foreign__": true, "id": _id, "cls": _cls}
    }

    static build(enc_data){
        return {"head": enc_data}
    }
}


class JSONDecoder{
    // Decodes lmf-file to object
    static decode_raw(raw_data){

    }
}