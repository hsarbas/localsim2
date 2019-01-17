class Entry extends Signal{
    constructor(uroad, flow_rates, obs_matrix=null, dta_matrix=null){
        super();

        this.events = ['dispatch'];

        this.uroad = uroad;
        this._flow_rates = new Map();
        this.set_flow_rates(flow_rates);
        this.agent_manager = null;
        this.arrival_iter = [];
        this.next_trigger = [];
        this.queue = [0] * this.uroad.get_lanes();

        this.distributions = null;
        this.default_dist = null;
        this.obs_matrix = obs_matrix;
        this.var_keyword = 'road';
        this.dta_matrix = new Map();
        if(dta_matrix){
            this.dta_matrix = dta_matrix;
        }

        this.update_matrix(obs_matrix);
    }

    get_flow_rates(){
        return this._flow_rates;
    }

    set_flow_rates(new_flow_rates) {
        this._flow_rates.clear();
        if (new_flow_rates && new_flow_rates.size > 0) {
            for (let k of new_flow_rates.keys()) {
                this._flow_rates.set(k, new_flow_rates.get(k));
            }
        }
    }

    update_matrix(new_matrix){
        if(new_matrix && this._check_data_integrity(new_matrix)){
            this.obs_matrix = new_matrix;

            let dist = new Map();
            dist.set('bus', new_matrix.get('bus'));
            dist.set('car', new_matrix.get('car'));
            dist.set('motorcycle', new_matrix.get('motorcycle'));
            dist.set('jeep', new_matrix.get('jeep'));

            this.distributions = random_event_generator(dist);
        }
        else{
            this.distributions = null;
            this.obs_matrix = null;
        }

        let distribution = new Map();
        distribution.set('bus', BUS_DEFAULT_DIST);
        distribution.set('car', CAR_DEFAULT_DIST);
        distribution.set('motorcycle', MOTORCYCLE_DEFAULT_DIST);
        distribution.set('jeep', JEEP_DEFAULT_DIST);
        distribution.set('truck', TRUCK_DEFAULT_DIST);
        distribution.set('tricycle', TRICYCLE_DEFAULT_DIST);

         this.default_dist = random_event_generator(distribution);
    }

    _check_data_integrity(matrix){
        return true;
    }

    deconstruct(){
        const cls = "localsim.models.meta.traffic.Entry";
        let _args = null;
        let _flow_rates = null;
        if(this.get_flow_rates()){
            _flow_rates = map_to_obj(this.get_flow_rates());
        }

        let _dta_matrix = null;
        if(this.dta_matrix){
            _dta_matrix = map_to_obj(this.dta_matrix);
        }

        if(this.obs_matrix){
            _args = [this.uroad, _flow_rates, {'car': this.obs_matrix.get('car'), 'bus': this.obs_matrix.get('bus'),
                'truck': this.obs_matrix.get('truck'), 'motorcycle': this.obs_matrix.get('motorcycle'),
                'jeep': this.obs_matrix.get('jeep'), 'tricycle': this.obs_matrix.get('tricycle')}, _dta_matrix];
        }
        else{
            _args = [this.uroad, _flow_rates, null, _dta_matrix];
        }

        const args = _args;
        const kwargs = {};
        return [cls, args, kwargs]
    }
}

class Route{
    constructor(uroad, exits, obs_matrix=null, onset=null, emergency_stop=null, offset=null){

        this.min_onset = config.to_px(MIN_ONSET);
        this.min_emergency_stop = config.to_px(EMERGENCY_STOP);
        this.min_offset = config.to_px(MIN_OFFSET);

        this.uroad = uroad;
        this._exits = [];
        this.set_exits(exits);

        this.obs_matrix = obs_matrix;
        this.var_keyword = 'agent';
        this._derived_onset = onset == null;

        this._onset = onset || Math.min(uroad.length, this.min_onset);
        //this.onset = this.get_onset();

        this.emergency_stop = emergency_stop || this.min_emergency_stop;
        this.offset = offset || this.min_offset;

        this.distributions = null;
        this.default_dist = null;

        this.update_matrix(obs_matrix);
    }

    get_onset(){
        if(this._derived_onset){
            this._onset = Math.min(this.uroad.length, this.min_onset);
        }

        return this._onset;
    }

    set_onset(new_onset){
        if(0 < new_onset <= this.uroad.length){
            this._derived_onset = false;
            this._onset = new_onset;
        }
    }

    get_exits(){
        let exits = [];
        for(let road of this._exits){
            exits.push(road);
        }
        return exits;
    }

    set_exits(exits){
        let _exits = [];
        for(let road of exits){
            _exits.push(road);
        }
        this._exits = _exits;
    }

    update_matrix(new_matrix){
        this.distributions = new Map();

        if(new_matrix && this._check_data_integrity(new_matrix)){
            this.obs_matrix = new_matrix;

            for(let agent of new_matrix.keys()){
                this.distributions.set(agent, random_event_generator(new_matrix.get(agent)));
            }
        }
        else{
            this.distributions = null;
            this.obs_matrix = null;
        }

        let distribution = new Map();

        for(let ctr = 0; ctr < this.get_exits().length; ctr++){
            let road = this.get_exits()[ctr];
            distribution.set(road.label, (1.0 / this.get_exits().length));
        }

        this.default_dist = random_event_generator(distribution);
    }

    _check_data_integrity(matrix){
        return true;
    }

    deconstruct(){
        const cls = "localsim.models.meta.traffic.Route";
        let _args = null;

        if(this.obs_matrix){
            let temp = new Map();
            for(let a of this.obs_matrix.keys()){
                temp.set(a, map_to_obj(this.obs_matrix.get(a)));
            }

            let obs_matrix = map_to_obj(temp);
            _args = [this.uroad, this.get_exits(), obs_matrix];
        }
        else{
            _args = [this.uroad, this.get_exits(), this.obs_matrix];
        }
        const args = _args;

        const kwargs = {"onset": this.get_onset(), "emergency_stop": this.emergency_stop, "offset": this.offset};
        return [cls, args, kwargs]
    }
}