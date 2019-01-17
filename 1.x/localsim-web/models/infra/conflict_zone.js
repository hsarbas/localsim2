let conflict_id_counter = count();

class ConflictArea extends Signal{

    constructor(road, pos, lane, length=0.0, width=0, conflict_group=[], type_=null){
        super();

        this.events = ['move', 'destroy', 'change'];

        this.id = road.label + '-' + lane.toString() + '-' + round(pos, 2);
        this.road = road;
        this.pos = pos;
        this.lane = Number(lane);
        this.length = length;
        this.width = width;
        this.zone = this.lane + this.width;
        this.exit = this.pos + this.length;
        this.affected_lanes = [];
        this.conflict_group = conflict_group;
        this.type_ = type_;

        this.road.connect(this, 'move', this._signal_callback);
        this.road.connect(this, 'change', this._signal_callback);

        for(let ctr=this.lane; ctr<this.lane+this.width+1; ctr++){
            this.affected_lanes.push(ctr);
        }
    }

    _signal_callback(event, source, kwargs){
        if(event == 'move'){
            this.set_length(this.road.length);
            this.set_pos(0);
            this.fire('move');
        }
        else if(event == 'destroy'){
            this.destroy();
        }
        else if(event == 'change' && kwargs && kwargs.has('value')){
            if(kwargs.get('value') == 'priority'){
                this.fire('change');
            }
            this.fire('move');
        }
    }

    set_pos(new_pos){
        if(new_pos != this.pos){
            this.pos = new_pos;
            this.exit = this.pos + this.length;
            this.fire('move', new Map().set('value', 'entry'));
        }
    }

    set_length(new_length){
        if(new_length != this.length){
            this.length = new_length;
            this.exit = this.pos + this.length;
            this.fire('move', new Map().set('value', 'length'));
        }
    }

    set_lane(new_lane){
        if(new_lane != this.lane){
            this.lane = new_lane;
            this.affected_lanes = [];
            for(let ctr=this.lane; ctr<this.lane+this.width+1; ctr++){
                this.affected_lanes.push(ctr);
            }
            this.fire('move', new Map().set('value', 'lane'));
        }
    }

    set_width(new_width){
        if(new_width != this.width){
            this.width = new_width;
            this.affected_lanes = [];
            for(let ctr=this.lane; ctr<this.lane+this.width+1; ctr++){
                this.affected_lanes.push(ctr);
            }
            this.fire('move', new Map().set('value', 'width'));
        }
    }

    destroy(){
        this.fire('destroy');
    }

    trigger(curr_entry, curr_lane, ssd=0.0, agent_length=0.0){
        if(this.affected_lanes.includes(curr_lane) && (curr_entry < this.pos <= curr_entry + ssd)){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('entrydist', this.pos - curr_entry);
            ret.set('exitdist', this.exit - curr_entry - agent_length);
            ret.set('id', this.id);
            ret.set('road', this.road);
            ret.set('conftype', this.type_);
            ret.set('confgroup', this.conflict_group);
            return ret;
        }
        else if(this.affected_lanes.includes(curr_lane) && (this.pos <= curr_entry) && (curr_entry - agent_length <= this.exit)){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('entrydist', 0.0);
            ret.set('exitdist', this.exit - curr_entry - agent_length);
            ret.set('id', this.id);
            ret.set('road', this.road);
            ret.set('conftype', this.type_);
            ret.set('confgroup', this.conflict_group);
            return ret;
        }

        return null;
    }

    deconstruct(){
        const cls = 'localsim.models.infra.conflict_zone.ConflictZone';
        const args = [this.road, this.pos, this.lane, this.length, this.width, this.conflict_group, this.type_];
        const kwargs = {};
        return [cls, args, kwargs];
    }

    distance_from(pos, raw=false){
        if(raw){
            let ret = new Map();
            ret.set('entry', this.pos - pos);
            ret.set('exit', this.exit - pos);
            return ret;
        }
        else{
            let ret = new Map();
            ret.set('entry', config.to_m(this.pos) - pos);
            ret.set('exit', config.to_m(this.exit) - pos);
        }
    }
}