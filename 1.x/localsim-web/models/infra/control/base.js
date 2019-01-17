let _id_counter = count();

class AbstractDynamicControl extends Signal{
    constructor(road, pos, lane, state, start){
        super();

        this.events = ['move', 'update', 'destroy'];
        this.id = 'dcontrol-' + _id_counter.next().toString(16);
        this.road = road;
        this.pos = pos;
        this.lane = lane;

        this._init_state = [state, start];
        this._state = [this.get_init_state()[0], 0];
        this._init_pass = true;

        this.clock = null;

        this.road.connect(this, 'change', this._signal_callback);
        this.road.connect(this, 'move', this._signal_callback);
    }

    _signal_callback(event, source, extras){
        if(event == 'move' || event == 'change'){
            if(this.road.length >= this.pos){
                this.fire('move');
            }
        }
        else if(event == 'coarse'){
            if(this.clock.now/1000 >= this.get_init_state()[1]){
                if(this._init_pass == true){
                this.set_state([1, 0]);
                this._init_pass = false;
                }

                this._state[1] += 1;
                this.update();
            }
        }
        else if(event == 'stop'){
            this.reset();
        }
    }

    run(clock){
        this.reset();
        this.set_clock(clock);
        this.clock.connect(this, 'coarse', this._signal_callback);
        this.clock.connect(this, 'stop', this._signal_callback);

    }

    set_clock(new_clock){
        this.clock = new_clock;
        this.reset();
    }

    set_pos(new_pos){
        if(new_pos != this.pos){
            this.pos = new_pos;
            this.fire('move', new Map().set('value', 'pos'));
        }
    }

    set_lane(new_lane){
        if(new_lane != this.lane){
            this.lane = new_lane;
            this.fire('move', new Map().set('value', 'lane'))
        }
    }

    get_state(){
        return this._state;
    }

    set_state(new_state){
        if(new_state != this._state){
            this._state = new_state;
            this.fire('update');
        }
    }

    get_init_state(){
        return this._init_state;
    }

    set_init_state(new_init_state){
        if(new_init_state != this._init_state){

            this._init_state = new_init_state;
            this._state = this._init_state;
            this.fire('update');
        }
    }

    reset(){
        if(this.clock){
            this.clock.disconnect(this, 'coarse', this._signal_callback);
            this.clock.disconnect(this, 'stop', this._signal_callback);
        }
        this.set_state([this.get_init_state()[0], 0]);
        this._init_pass = true;
    }

    destroy(){
        this.fire('destroy');
    }
}

class AbstractStaticControl extends Signal{

    constructor(road, pos, lane, zone){
        super();

        this.events =  ['move', 'destroy'];
        this.id = 'scontrol-' + _id_counter.next().toString(16);
        this.road = road;
        this.lane = lane;
        this.zone = zone;
        this.pos = pos;

        this.exit = this.pos + this.zone;
        this.road.connect(this, 'change', this._signal_callback);
        this.road.connect(this, 'move', this._signal_callback);
    }

    set_pos(new_pos){
        if(new_pos != this.pos){
            this.pos = new_pos;
            this.exit = this.pos + this.zone;
            this.fire('move', new Map().set('value', 'pos'));
        }
    }

    set_zone(new_zone){
        if(new_zone != this.zone){
            this.zone = new_zone;
            this.exit = this.pos + this.zone;
            this.fire('move', new Map().set('value', 'zone'));
        }
    }

    set_lane(new_lane){
        if(new_lane != this.lane){
            this.lane = new_lane;
            this.fire('move', new Map().set('value', 'lane'));
        }
    }

    _signal_callback(event, source, kwargs){
        if(event == 'move' || event == 'change'){

            if(this.road.length >= this.exit){
                this.fire('move');
            }
        }
    }

    destroy(){
        this.fire('destroy');
    }
}