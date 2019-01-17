class StopLight extends AbstractDynamicControl{

    constructor(road, pos, lane, phase, state=null, start=0){
        if(!state){
            state = RED;
        }
        super(road, pos, lane, state, start);
        this.phase = phase;
    }

    trigger(curr_pos, curr_lane, ssd=0.0){
        if(this.lane == curr_lane && curr_pos <= this.pos <= curr_pos + ssd){
            if([RED, YELLOW].includes(this.state[0])){
                let ret = new Map();
                ret.set('type', this.constructor.name);
                ret.set('entrydist', this.pos - curr_pos);
                ret.set('state', this.state[0]);
                ret.set('id', this.id);
                ret.set('lane', this.lane);
            }
        }
        return null;
    }

    update(){
        if(this.get_state()[1] == this.phase[this.get_state()[0]]){
            this.set_state([STATES[(this.get_state()[0] + 1) % STATES.length], 0]);
        }
    }

    deconstruct(){
        const _cls = "localsim.models.infra.control.concrete.StopLight";
        const _args = [this.road, this.pos, this.lane, this.phase];
        const _kwargs = {"state":parseInt(this.get_init_state()[0]), "start":parseInt(this.get_init_state()[1])};
        return [_cls, _args, _kwargs]
    }
}

class Stop extends AbstractStaticControl{

    constructor(road, pos, lane){
        super(road, pos, lane, 0);

    }

    trigger(curr_pos, curr_lane, ssd=0.0){
        if(this.lane == curr_lane && curr_pos <= this.pos <= curr_pos + ssd){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('entrydist', this.pos - curr_pos);
            ret.set('id', this.id);
            ret.set('lane', this.lane);
            return ret;
        }
        return null;
    }

    deconstruct(){
        const _cls = "localsim.models.infra.control.concrete.Stop";
        const _args = [this.road, this.pos, this.lane];
        const _kwargs = {};
        return [_cls, _args, _kwargs]
    }
}

class Yield extends AbstractStaticControl{

    constructor(road, pos, lane){
        super(road, pos, lane, 0);

    }

    trigger(curr_pos, curr_lane, ssd=0.0){
        if(this.lane == curr_lane && curr_pos <= this.pos <= curr_pos + ssd){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('entrydist', this.pos - curr_pos);
            ret.set('id', this.id);
            ret.set('lane', this.lane);
            return ret;
        }
        return null;
    }

    deconstruct(){
        const _cls = "localsim.models.infra.control.concrete.Yield";
        const _args = [this.road, this.pos, this.lane];
        const _kwargs = {};
        return [_cls, _args, _kwargs]
    }
}

class SpeedLimitZone extends AbstractStaticControl{

    constructor(road, pos, lane, zone, limit){
        super(road, pos, lane, zone);
        this.limit = limit;
    }

    trigger(curr_pos, curr_lane, ssd=0.0){
        if(this.lane == curr_lane && curr_pos < this.pos <= curr_pos + ssd){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('limit', this.limit);
            ret.set('entrydist', this.pos - curr_pos);
            ret.set('id', this.id);
            ret.set('lane', this.lane);
            return ret;
        }

        else if(this.lane ==curr_lane && this.pos <= curr_pos <= this.exit){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('limit', this.limit);
            ret.set('entrydist', 0.0);
            ret.set('id', this.id);
            ret.set('lane', this.lane);
            return ret;
        }
        return null;
    }

    deconstruct(){
        const _cls = "localsim.models.infra.control.concrete.SpeedLimitZone";
        const _args = [this.road, this.pos, this.lane, this.zone, this.limit];
        const _kwargs = {};
        return [_cls, _args, _kwargs]
    }
}

class TypeRestrictionZone extends AbstractStaticControl{

    constructor(road, pos, lane, zone, bias, white_list){
        super(road, pos, lane, zone);
        this.white_list = white_list;
        this.bias = bias;
    }

    trigger(curr_pos, curr_lane, ssd=0.0){
        if(this.lane == curr_lane && curr_pos < this.pos <= curr_pos + ssd){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('restrict', this.white_list);
            ret.set('entrydist', this.pos - curr_pos);
            ret.set('lane', this.lane);
            ret.set('id', this.id);
            ret.set('bias', this.bias);
            return ret;
        }

        else if(this.lane == curr_lane && this.pos <= curr_pos <= this.exit){
            let ret = new Map();
            ret.set('type', this.constructor.name);
            ret.set('restrict', this.white_list);
            ret.set('entrydist', 0.0);
            ret.set('lane', this.lane);
            ret.set('id', this.id);
            ret.set('bias', this.bias);
            return ret;
        }

        return null;
    }

    deconstruct(){
        const _cls = "localsim.models.infra.control.concrete.TypeRestrictionZone";
        const _args = [this.road, this.pos, this.lane, this.zone, this.bias, this.white_list];
        const _kwargs = {};
        return [_cls, _args, _kwargs]
    }
}

class BusTerminalZone extends AbstractStaticControl{

    constructor(road, pos, lane, zone, label, mean, std_dev){
        super(road, pos, lane, zone);
        this.label = label;

        this.mean = mean;
        this.std_dev = std_dev;
    }


    deconstruct(){
        const _cls = "localsim.models.infra.control.concrete.BusTerminalZone";
        let args = [this.road, this.pos, this.lane, this.zone, this.label, this.mean, this.std_dev];

        const _args = args;

        const _kwargs = {};
        return [_cls, _args, _kwargs]
    }
}