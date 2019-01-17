class DAgent{
    constructor(gc, agent){
        this.gc = gc;
        this.object = agent;
        this.item = null;
        this._item = null;
        this.width = null;
        this.lc_transition_rate = Math.max(1.5, 2.25); // + nrand.normal()
        this.lc_type = null;

        this.object.connect_to_all(this, this.responder);
        this.draw();
    }

    responder(event, source, extras){
        if(event == 'destroy'){
            this.destroy();
        }
        else if(event == 'move'){
            this.move();
        }
        else{
            throw 'NotImplementedError';
        }
    }

    move(){
        if(!this.object){
            throw ReferenceError;
        }

        let agent = this.object;
        let width = config.to_px(agent.width) * this.gc.zoom_level;

        let points = this._get_draw_points();
        let car_points = points[0];
        let blinker_points = points[1];

        if(this.width != width){
            this.width = width;
            this.item.attr("stroke-width", this.width);
        }

        let line = d3.line()
            .x(function(d){ return d.get('x')})
            .y(function(d){ return d.get('y') });
        this.item.attr("d", line(car_points));

        let side = this.object.lane_changing();
        let blinker_color = NORMAL;
        let sp = [0, 0];

        let left_blinker_x = blinker_points[0].get('x');
        let left_blinker_y = blinker_points[0].get('y');
        let right_blinker_x = blinker_points[1].get('x');
        let right_blinker_y = blinker_points[1].get('y');

        if(side == RIGHT){
            sp = [right_blinker_x, right_blinker_y];
            if(agent.lc_state == FORCED_MERGE){
                this.lc_type = agent.lc_state;
            }
        }
        else if(side == LEFT){
            sp = [left_blinker_x, left_blinker_y];
            if(agent.lc_state == FORCED_MERGE){
                this.lc_type = agent.lc_state;
            }
        }

        if(this.lc_type == FORCED_MERGE){
            blinker_color = FORCED;
        }
        //else if(this.lc_type == null){
        //    sp = [0, 0];
        //}

        this._item.attr('cx', sp[0])
        .attr('cy', sp[1])
        //.attr('fill', blinker_color)
        .attr('fill', BLINKER_COLOR)
        //.attr('stroke', blinker_color)
        .attr('stroke', BLINKER_COLOR);
    }

    draw(){
        if(!this.object){
            throw ReferenceError;
        }

        let points = this._get_draw_points();
        let car_points = points[0];

        this._item = this.gc.create_oval(this, 0, 0, BLINKER_RADIUS, NORMAL, NORMAL);

        //let color = AGENT_COLOR[Math.floor(Math.random() * AGENT_COLOR.length)];
        let color = null;
        if(this.object.type_ == 'car'){
            color = CAR_COLOR;
        }
        else if(this.object.type_ == 'bus'){
            color = BUS_COLOR;
        }
        else if(this.object.type_ == 'truck'){
            color = TRUCK_COLOR;
        }
        else if(this.object.type_ == 'jeep'){
            color = JEEP_COLOR;
        }
        else if(this.object.type_ == 'motorcycle'){
            color = MOTORCYCLE_COLOR;
        }
        else if(this.object.type_ == 'tricycle'){
            color = TRICYCLE_COLOR;
        }

        let width = config.to_px(this.object.width) * this.gc.zoom_level;
        this.width = width;

        this.item = this.gc.create_line(this, car_points, null, null, width, 'none', color);
    }

    _get_draw_points(){
        let agent = this.object;
        let road = agent.road;
        let pos = config.to_px(agent.pos);
        let lane = agent.lane;

        let length = config.to_px(agent.length);
        let circular_rear_radius = config.to_px(agent.width) / 2;

        let cont_lateral = 0.5;
        let front_angle = 0.0;

        if(agent._lc_delay < this.lc_transition_rate){
            if(this.lc_type == null){
                this.lc_type = NORMAL_MERGE;
            }

            cont_lateral = round(0.5 - (1.0 - agent._lc_delay / this.lc_transition_rate) * agent.lane_changing(), 2);

            if(agent._lc_delay <= this.lc_transition_rate/2){
                front_angle = 0.5 * agent._lc_delay / this.lc_transition_rate * agent.lane_changing();
            }
            else{
                front_angle = 0.5 * (1.0 - agent._lc_delay / this.lc_transition_rate) * agent.lane_changing();
            }

            front_angle = round(front_angle, 2);
        }
        else{
            cont_lateral = 0.5;
            front_angle = 0.0;
            this.lc_type = null;
        }

        let agent_points = [];
        let blinker_points = [];

        let ret = this.gc.scene.locate_global(road, pos - circular_rear_radius, lane + cont_lateral + front_angle);
        let front = new Map();
        front.set('x', ret[0]);
        front.set('y', ret[1]);
        agent_points.push(front);

        ret = this.gc.scene.locate_global(road, pos - length + circular_rear_radius, lane + cont_lateral);
        let rear = new Map();
        rear.set('x', ret[0]);
        rear.set('y', ret[1]);
        agent_points.push(rear);

        ret = this.gc.scene.locate_global(road, pos, lane + cont_lateral + front_angle - 0.25);
        let b_left = new Map();
        b_left.set('x', ret[0]);
        b_left.set('y', ret[1]);
        blinker_points.push(b_left);

        ret = this.gc.scene.locate_global(road, pos, lane + cont_lateral + front_angle + 0.25);
        let b_right = new Map();
        b_right.set('x', ret[0]);
        b_right.set('y', ret[1]);
        blinker_points.push(b_right);

        for(let point of agent_points){
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }

        for(let point of blinker_points){
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }

        return [agent_points, blinker_points];

    }

    destroy(){
        if(this.item){
            this.gc.delete_(this.item);
        }

        if(this._item){
            this.gc.delete_(this._item);
        }

        this.object.disconnect_to_all(this, this.responder);
        this.object = null;
        this.item = null;
        this._item = null;
    }
}