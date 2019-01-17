let agent_id_counter = count();

class AbstractAgent extends Signal{
    constructor(id, type_, length, width, road, pos, lane){
        super();

        this.events = ['move', 'destroy'];

        //this.id = agent_id_counter.next().toString(16);
        this.id = id;
        this.type_ = type_;

        this.length = length;
        this.width = width;

        this.road = road;
        this.pos = pos;
        this.lane = lane;

        this._lc_delay = LC_DELAY * 0.75; // + np.random.normal()
        this._lc_dest_dir = THROUGH;
        this.lc_state = NORMAL_MERGE;
    }

    lane_changing(){
        return this._lc_dest_dir;
    }

    update(new_road, new_pos, new_lane){
        if(this.road != new_road){
            this.road = new_road;
        }

        if(this.pos != new_pos){
            this.pos = new_pos;
        }

        if(this.lane != new_lane){
            this.lane = new_lane;
        }

        this.fire('move');
    }

    update_lc(new_lc_delay, new_lc_dest_dir, new_lc_state){
        if(this._lc_delay != new_lc_delay){
            this._lc_delay = new_lc_delay;
        }

        if(this._lc_dest_dir != new_lc_dest_dir){
            this._lc_dest_dir = new_lc_dest_dir;
        }

        if(this.lc_state != new_lc_state){
            this.lc_state = new_lc_state;
        }
    }

    destroy(){
        this.fire('destroy');
    }
}

class AgentManager{
    constructor(){
        this.agents = new Map();
        this.actual_clock = new Clock(DT * 1000, null, 1000);
    }

    add_agent(agent){
        this.agents.set(agent.id, agent);
    }

    update_agent(agent_id, new_road, new_pos, new_lane, new_lc_delay, new_lc_dest_dir, new_lc_state){
            let agent_ = this.agents.get(agent_id);
            agent_.update_lc(new_lc_delay, new_lc_dest_dir, new_lc_state);
            agent_.update(new_road, new_pos, new_lane);
    }

    delete_agent(id_){
        this.agents.get(id_).destroy();
        this.agents.delete(id_);
    }

    delete_all_agents(){
        for(let key of this.agents.keys()){
            this.delete_agent(key);
        }
    }

    reset(){
        this.actual_clock.stop();
        this.delete_all_agents();
        this.agents.clear();
    }
}