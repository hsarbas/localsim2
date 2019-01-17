let _zone_id_counter = count();

class AbstractSurveyor extends Signal{
    constructor(road, pos, lane, zone, is_on){
        super();

        this.events = ['move', 'update', 'destroy'];

        this.id = _zone_id_counter.next().value.toString(16);
        this.road = road;
        this.pos = pos;
        this.zone = zone;
        this.lane = lane;
        this.exit = this.pos + this.zone;
        this.active = is_on;

        this.clock = null;
        this.agent_manager = null;

        this.road.connect(this, 'change', this._signal_callback);
        this.road.connect(this, 'move', this._signal_callback);
    }

    _signal_callback(event, source){
        if(event == 'change' || event == 'move'){
            if(this.road.length >= this.exit){
                this.fire('move');
            }
        }

        else if(event == 'fine' && this.active){
            this.update();
        }

        else if(event == 'stop' && this.active){
            this.reset();
        }
    }

    run(agent_manager){
        this.clock = agent_manager.actual_clock;
        this.agent_manager = agent_manager;
        this.clock.connect(this, 'fine', this._signal_callback);
        this.clock.connect(this, 'stop', this._signal_callback);
    }

    clear(){
        if(this.clock != null){
            this.clock.disconnect(this, 'coarse', this._signal_callback);
            this.clock.disconnect(this, 'stop', this._signal_callback);
        }
    }

    set_clock(new_clock){
        this.clock = new_clock;
        this.clear();
    }

    set_agent_manager(new_manager){
        this.agent_manager = new_manager;
        this.clear();
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

    destroy(){
        this.fire('destroy');
    }
}

class SurveyZone extends AbstractSurveyor{
    constructor(road, pos, lane, zone, type_){
        super(road, pos, lane, zone, false);

        this.type_ = type_;
    }

    deconstruct(){
        const cls = 'localsim.models.infra.survey_zone.SurveyZone';
        const args = [this.road, this.pos, this.lane, this.zone, this.type_];
        const kwargs = {};
        return [cls, args, kwargs];
    }
}