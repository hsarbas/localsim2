/**
 * COMMENT
 * Base class for any object that takes in and fires callbacks
 */

class Signal{

    constructor(){
        this.events = null;
        this.__callbacks = null;
        this.__obj = null;

    }

    connect(obj, event, callback){
        this.__obj = obj;

        if(this.__callbacks == null){
            this.__callbacks = new Map();
        }


        if (this.events.includes(event)){
            if(callback instanceof Function){
                let weak_key = this.__obj;
                let method_name = callback.name;

                if(!this.__callbacks.has(event)){
                    this.__callbacks.set(event, new Map()); // WeakMaps are not iterable
                }

                if(!(this.__callbacks.get(event).has(weak_key))){
                    this.__callbacks.get(event).set(weak_key, [method_name]);
                }

                else if(!(this.__callbacks.get(event).get(weak_key).includes(method_name))){
                    this.__callbacks.get(event).get(weak_key).push(method_name);
                }
            }

            else{
                throw 'Callback not a method of a class';
            }
        }

        else{
            throw 'Unknown event to this signal';
        }
    }

    connect_to_all(obj, callback){
        for(let ctr=0; ctr<this.events.length; ctr++){
            this.connect(obj, this.events[ctr], callback);
        }
    }

    disconnect(obj, event, callback){
        this.__obj = obj;
        if(this.events.includes(event)){
            if(this.__callbacks){
                if(callback instanceof Function){
                    let weak_key = this.__obj;
                    let method_name = callback.name;

                    if(this.__callbacks.get(event).has(weak_key) && this.__callbacks.get(event).get(weak_key).includes(method_name)){
                        if(this.__callbacks.get(event).get(weak_key).length == 1){
                            this.__callbacks.get(event).delete(weak_key);
                        }
                        else{
                            let index = this.__callbacks.get(event).get(weak_key).indexOf(method_name);
                        }
                    }
                }
            }
        }
    }

    disconnect_to_all(obj, callback){
        for(let ctr=0; ctr<this.events.length; ctr++){
            this.disconnect(obj, this.events[ctr], callback);
        }
    }

    fire(event_, kwargs=null){
        let source = this;
        if(this.events.includes(event_)){
            if(this.__callbacks){
                this.__callbacks.get(event_).forEach(function(method_list, weak_key){
                    method_list.forEach(function(m){
                        weak_key[m](event_, source, kwargs);
                    });
                });
            }
        }
    }
}


class Clock extends Signal{
    constructor(dt_fine, end=null, dt_coarse=null){
        super();
        this.events = ['fine', 'stop', 'coarse'];

        this.start = 0;
        this.end = end;

        this.dt_fine = dt_fine;
        this.dt_coarse = dt_coarse;
        this.now = this.start;
    }

    next(){
        if(!this.end || this.now <= this.end){
            this.now += this.dt_fine;

            if(this.dt_coarse && (this.now % this.dt_coarse == 0)){
                this.fire('coarse', new Map().set('time', this.now));
            }

            this.fire('fine', new Map().set('time', this.now));

            return this.now;
        }
        else{
            this.fire('stop');
            throw 'StopIteration';
        }
    }

    stop(){
        this.now  = this.start;
        this.fire('stop');
    }

    print_curr_time(){
        console.log('Time is now ', this.now);
    }

    step(){
        let time = null;
        try{
            time = this.next()
        }
        catch(error){
            return null;
        }
        return time;
    }
}