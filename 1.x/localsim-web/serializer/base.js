/**
 * Created by Chris on 6/6/2017.
 */

function* _idMaker() {
    let index = 0;
    while(true){
        yield index++;
    }
}

let _idGen = _idMaker();
let _cache = _idGen.next().value; //throw first 0
_cache = [];

function dummy_encode(group, cached){
    let encoded = [];
    let built = JSONEncoder.build(encoded);
    return group + JSON.stringify(built, null, 4) + ';\n';
}

function serial_encode(objs, group, cached){
    let encoded = [];
    for(let obj of objs){
        let _id = _idGen.next().value;
        let partial = {'id': _id, 'obj': obj};
        _cache.push(partial);
        let raw = inspect_element(obj.deconstruct());
        encoded.push(JSONEncoder.encode_raw([_id].concat(raw)));
    }
    let built = JSONEncoder.build(encoded);
    return group + JSON.stringify(built, null, 4) + ';\n'
}

function map_single_encode(objs, group, cached){
    let encoded = [];

    let keys_iter = objs.keys();
    let objects = [];

    for(let ctr=0; ctr<objs.size; ctr++){
        let _o = objs.get(keys_iter.next().value);
        if(_o){
            objects.push(_o);
        }
    }

    for(let obj of objects){
        let _id = _idGen.next().value;
        let partial = {'id': _id, 'obj': obj};
        _cache.push(partial);
        let raw = inspect_element(obj.deconstruct());
        encoded.push(JSONEncoder.encode_raw([_id].concat(raw)));
    }

    let built = JSONEncoder.build(encoded);
    return group + JSON.stringify(built, null, 4) + ';\n'
}

function map_multi_encode(objs, group, cached){
    let encoded = [];

    for(let obj of objs){
        for(let item of obj[1]){
            let _id = _idGen.next().value;
            let partial = {'id': _id, 'obj': item};
            _cache.push(partial);
            let raw = inspect_element(item.deconstruct());
            encoded.push(JSONEncoder.encode_raw([_id].concat(raw)));
        }
    }
    let built = JSONEncoder.build(encoded);
    return group + JSON.stringify(built, null, 4) + ';\n'
}

function save(filename, value){
    // Function to save lmf file
    let raw = "SAVE " + filename + "\r\n" + value;
    //  TODO: download file here
    $.post("/main.html", raw, function(data){
        let a = '<a href=\"/tmp/' + filename + '\" id=\"aaa\" download>a</a>';
        $('#save-link').prepend(a);
        $('#aaa')[0].click();
    })
}

function stream(duration, routing_mode, rand_string, animated, value){
    // Function to stream data

    let raw = "RUN " +
        duration + " " +
        routing_mode + " " +
        rand_string + " " +
        animated + "\r\n" + value;
    $.ajax({url: '/main.html', type: 'POST', data: raw,
            }).done(function(data){
                    console.log(data);
            }).fail(function(){
                    console.log("Error: cannot receive data");
            });
}

function result(filename){
    //Function to get excel file from server
    //TODO: download file here
    $.get("/" + filename)
}

function inspect_element(elem){
    if(elem instanceof Array){
        let arr = [];
        for(let a of elem){
            arr.push(this.inspect_element(a));
        }
        return arr;

    }else if(this._checkJSON(elem)){
        for(let a in elem) {
            let temp = elem[a];
            elem[a] = this.inspect_element(temp);
        }
        return elem;

    }else{
        if(elem instanceof Object){
            let scan = 0;
            try{
                let temp = elem.deconstruct();
                for(let item of _cache){
                    if(item.obj === elem){
                        elem = JSONEncoder.encode_foreign([item.id, temp[0]]);
                        break;
                    }
                    scan++;
                }
                if(scan === _cache.length){
                    throw 'Unserialized'
                }
            }catch(err){
                if(err === 'Unserialized'){
                    console.log('Cannot find foreign object!');
                    elem = null
                }else{
                    console.log('Caught an unserializable object!');
                }
            }
        }else if(elem === "Major"){
            elem = 1;
        }else if(elem === "Minor"){
            elem = 0;
        }else if(elem === null){
            elem = 0;
        }
        return elem;
    }
}

function _checkJSON(m){
    let a = null;
    if(m instanceof Object){
        try {a = JSON.stringify(m);}
        catch(err){ return false;}
    }
    if(typeof m === 'string'){
        try{a = JSON.parse(m)}
        catch(err){ return false;}
    }
    if(!(m instanceof Object)){
        return false;
    }
    return true;
}

function purge_cache() {
    _cache = [];
}