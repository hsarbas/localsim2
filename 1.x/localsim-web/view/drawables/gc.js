class GraphicsContext{

    constructor(parent){
        this.guide_canvas = this.make_canvas(parent, 'guide-canvas');
        this.canvas = this.make_canvas(parent, 'canvas');

        this.clock = null;
        this.simulator = null;
        this.scene = null;
        this.state = null;
        this.animated = true;
        this.undo_state = null;
        this.undo_state_list = [];

        this.zoom_level = 1.00;
        this.reset();

        this.registry = new Map();
        this.vars = new Map();
        this.extras = new Map();
        this.extras.set('uk', []);
        this.extras.set('q', []);
        this.extras.set('cvcc', []);
        this.extras.set('stoplight', []);

        config.connect(this, 'change', this._signal_callback);
        this._bind_mouse();

        this.osm = null;

        //this.draw_osm();

    }

    _signal_callback(event, source, extras){
        if(event == 'change'){
            let old = extras.get('old_px2m');

            for(let route_ of this.scene.routes.values()){
                if(route_){

                    route_.set_onset(config.to_px(route_.get_onset() * old));
                    route_.emergency_stop = config.to_px(route_.emergency_stop * old);
                    route_.offset = config.to_px(route_.offset * old);
                }
            }

            for(let uroad of this.scene.uroads){
                uroad.set_lane_width(config.to_px(old * uroad.get_lane_width()));
            }

            for(let iroad of this.scene.iroads){
                iroad.set_lane_width(config.to_px(old * iroad.get_lane_width()));
            }

            this.redraw_gridlines();
        }
    }

    start_trace(x, y, radius, trace_width, color1, color2){
        this.vars.set('trace_start_point', [x, y]);
        this.vars.set('trace_radius', radius);
        this.vars.set('trace_line', this.create_line(null, null, x, y, trace_width, 'none', 'black'));
        this.vars.set('trace_start', this.create_oval(null, x, y, radius, color1, NODE_OUTLINE));
        this.vars.set('trace_follow', this.create_oval(null, x, y, radius, color2, NODE_OUTLINE));
    }

    move_trace(x, y){
        let x0 = this.vars.get('trace_start_point')[0];
        let y0 = this.vars.get('trace_start_point')[1];
        let radius = this.vars.get('trace_radius');

        this.vars.get('trace_line').attr('x1', x0)
            .attr('y1', y0)
            .attr('x2', x)
            .attr('y2', y);

        this.vars.get('trace_follow').attr('cx', x)
            .attr('cy', y);
    }

    remove_trace(){
        try{
            this.vars.get('trace_follow').remove();
            this.vars.get('trace_line').remove();
            this.vars.get('trace_start').remove();

            this.vars.delete('trace_start_point');
            this.vars.delete('trace_radius');
            this.vars.delete('trace_line');
            this.vars.delete('trace_start');
            this.vars.delete('trace_follow');
        }
        catch(error){
            throw error;
        }
    }

    create_text(dobj, x, y, size, color){
        let item = this.canvas.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('font-family', 'sans-serif')
            .attr('font-size', size)
            .attr('fill', color)
            .text(dobj.object.label)
            .datum(dobj);

        item.id = this.get_id();
        this.registry.set(item.id, dobj);

        return item;
    }

    create_oval(dobj, x, y, radius, fill, outline){
        let item = this.canvas.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', radius)
            .attr('stroke', outline)
            .attr('fill', fill)
            .datum(dobj);

        if(dobj){
            item.id = this.get_id();
            this.registry.set(item.id, dobj);
        }
        return item;
    }

    create_line(dobj, points, x, y, trace_width, fill, stroke, dashed_stroke=false){
        let item = null;

        if(dobj == 'lane_marking'){
            let line = d3.line()
                .x(function(d){ return d.get('x')})
                .y(function(d){ return d.get('y') });


            item = this.canvas.append("path")
                .attr("d", line(points))
                .style("stroke", stroke)
                .attr("stroke-width", trace_width)
                .attr("stroke-linejoin", "round");

            if(dashed_stroke){
                item.style("stroke-dasharray", ("10, 5"));
            }
        }

        else if(dobj){
            let line = d3.line()
                .x(function(d){ return d.get('x')})
                .y(function(d){ return d.get('y') });


            item = this.canvas.append("path")
                .attr("d", line(points))
                .attr("fill", fill)
                .style("fill-opacity", 0.2)
                .style("stroke", stroke)
                .attr("stroke-width", trace_width)
                .attr("stroke-linejoin", "round")
                .datum(dobj);

            if(dobj instanceof DAgent){
                item.attr("stroke-linecap", "round");
            }

            if(dashed_stroke){
                item.style("stroke-dasharray", ("10, 5"));
            }
        }
        else{
            item = this.canvas.append("line")
                .attr('x1', x)
                .attr('y1', y)
                .attr('x2', x)
                .attr('y2', y)
                .attr("fill", "none")
                .style("stroke", 'black')
                .attr("stroke-width", trace_width)
                .datum(dobj);
        }

        if(dobj){
            item.id = this.get_id();
            this.registry.set(item.id, dobj);
        }
        return item;
    }
    get_id(){
        let rand = Math.random();
        while(this.registry.has(rand)){
            rand = Math.random();
        }

        return rand;
    }

    copy_scene(src, target){
        let uroads = new Map();
        let iroads = new Map();

        for(let uroad of src.uroads){
            let u = new Uninterrupted_Road(uroad.label, uroad.src, uroad.dst, uroad.get_lanes(), uroad.get_lane_width(),
                uroad.speed_limit, uroad.get_priority(), uroad.type_, uroad.z_axis, uroad.segments.get_split_nodes());
            uroads.set(u.label, u);

            target.add_road(u);
            if(!src.controls.has(uroad)){
                target.controls.set(u, []);
            }

            else{
                for(let control of src.controls.get(uroad)){
                    let c = null;
                    if(control instanceof Stop){
                        c = new Stop(uroads.get(control.road.label), control.pos, control.lane);
                    }
                    else if(control instanceof Yield){
                        c = new Yield(uroads.get(control.road.label), control.pos, control.lane);
                    }
                    else if(control instanceof SpeedLimitZone){
                        c = new SpeedLimitZone(uroads.get(control.road.label), control.pos, control.lane, control.zone, control.limit);
                    }
                    else if(control instanceof StopLight){
                        c = new StopLight(uroads.get(control.road.label), control.pos, control.lane, control.phase, control.get_init_state()[0], control.get_init_state()[1]);
                    }
                    else if(control instanceof BusTerminalZone){
                        c = new BusTerminalZone(uroads.get(control.road.label), control.pos, control.lane, control.zone, control.label, control.mean, control.std_dev);
                    }
                    else if(control instanceof TypeRestrictionZone){
                        c = new TypeRestrictionZone(uroads.get(control.road.label), control.pos, control.lane, control.zone, control.bias, control.white_list);
                    }
                    target.add_control(c);
                }
            }

            if(!src.surveyors.has(uroad)){
                target.surveyors.set(u, []);
            }
            else{
                for(let survey of src.surveyors.get(uroad)){
                    let s = new SurveyZone(uroads.get(survey.road.label), survey.pos, survey.lane, survey.zone, survey.type_);
                    target.add_surveyor(s);
                }
            }
        }

        for(let iroad of src.iroads){
            let i = new Interrupted_Road(iroad.label, uroads.get(iroad.src_road.label), uroads.get(iroad.dst_road.label), iroad.src_list, iroad.dst_list,
                iroad.get_lanes(), iroad.get_lane_width(), iroad.speed_limit, iroad.get_priority(), iroad.type_, iroad.z_axis, iroad.segments.get_split_nodes());
            iroads.set(i.label, i);

            target.add_road(i);
            if(!src.controls.has(iroad)){
                target.controls.set(i, []);
            }

            else{
                for(let control of src.controls.get(iroad)){
                    let c = null;
                    if(control instanceof Stop){
                        c = new Stop(iroads.get(control.road.label), control.pos, control.lane);
                    }
                    else if(control instanceof Yield){
                        c = new Yield(iroads.get(control.road.label), control.pos, control.lane);
                    }
                    else if(control instanceof SpeedLimitZone){
                        c = new SpeedLimitZone(iroads.get(control.road.label), control.pos, control.lane, control.zone, control.limit);
                    }
                    else if(control instanceof StopLight){
                        c = new StopLight(iroads.get(control.road.label), control.pos, control.lane, control.phase, control.get_init_state()[0], control.get_init_state()[1]);
                    }
                    else if(control instanceof BusTerminalZone){
                        c = new BusTerminalZone(iroads.get(control.road.label), control.pos, control.lane, control.zone, control.label, control.mean, control.std_dev);
                    }
                    else if(control instanceof TypeRestrictionZone){
                        c = new TypeRestrictionZone(iroads.get(control.road.label), control.pos, control.lane, control.zone, control.bias, control.white_list);
                    }
                    target.add_control(c);
                }
            }

            if(!src.surveyors.has(iroad)){
                target.surveyors.set(i, []);
            }
            else{
                for(let survey of src.surveyors.get(iroad)){
                    let s = new SurveyZone(iroads.get(survey.road.label), survey.pos, survey.lane, survey.zone, survey.type_);
                    target.add_surveyor(s);
                }
            }

            if(src.conflict_zones.has(iroad)){
                for(let conflict of src.conflict_zones.get(iroad)){
                    let c = new ConflictArea(i, conflict.pos, conflict.lane, conflict.length, conflict.width, conflict.conflict_group, conflict.type_);
                    target.add_conflict_zone(c);
                }
            }
        }

        for(let landmark of src.landmarks){
            let l = new Landmark(landmark.x, landmark.y, landmark.size, landmark.label, landmark.angle);
            target.add_landmark(l);
        }
    }

    update_undo_state(curr_state){

        let undo_state = new Scene();
        this.copy_scene(curr_state, undo_state);
        this.undo_state_list.push(undo_state);
    }

    get_undo_state(){
        return this.undo_state_list.pop();
    }

    undo(){
        let undo_state = this.get_undo_state();

        if(undo_state){
            this.clear_canvas();
            this.scene = new Scene();
            this.copy_scene(undo_state, this.scene);

            for(let uroad of this.scene.uroads){
                create_duroad(this, uroad);
                if(!this.scene.controls.has(uroad)){
                    this.scene.controls.set(uroad, []);
                }

                else{
                    for(let control of this.scene.controls.get(uroad)){
                        if(control instanceof Stop){
                            create_dstop(this, control);
                        }
                        else if(control instanceof Yield){
                            create_dyield(this, control);
                        }
                        else if(control instanceof SpeedLimitZone){
                            create_dspeed_limit(this, control, null);
                        }
                        else if(control instanceof StopLight){
                            create_dstoplight(this, control);
                        }
                        else if(control instanceof BusTerminalZone){
                            create_dpt_stop(this, control, null);
                        }
                        else if(control instanceof TypeRestrictionZone){
                            create_dtype_restriction(this, control, null);
                        }
                    }
                }
            }

            for(let iroad of this.scene.iroads){
                create_diroad(this, iroad);
                if(!this.scene.controls.has(iroad)){
                    this.scene.controls.set(iroad, []);
                }

                else{
                    for(let control of this.scene.controls.get(iroad)){
                        if(control instanceof Stop){
                            create_dstop(this, control);
                        }
                        else if(control instanceof Yield){
                            create_dyield(this, control);
                        }

                        else if(control instanceof SpeedLimitZone){
                            create_dspeed_limit(this, control, null);
                        }

                        else if(control instanceof StopLight){
                            create_dstoplight(this, control);
                        }

                        else if(control instanceof BusTerminalZone){
                            create_dpt_stop(this, control, null);
                        }

                        else if(control instanceof TypeRestrictionZone){
                            create_dtype_restriction(this, control, null);
                        }
                    }
                }

                if(this.scene.conflict_zones.has(iroad)){
                    for(let conflict of this.scene.conflict_zones.get(iroad)){
                        create_dconflict_area(this, conflict, null);
                    }
                }
            }

            for(let landmark of this.scene.landmarks){
                create_dlandmark(this, landmark);
            }

            for(let survey_list of this.scene.surveyors.values()){
                for(let survey of survey_list){
                    create_dsurvey_zone(this, survey, null);
                }
            }
        }
        else{
            alert('No action to undo.');
        }
    }

    reset(){
        config.reset();
        this.clear_canvas();

        if(this.state == null){
            this.state = app.select_control;
        }

        this.scene = new Scene();
        this.undo_state_list = [];
        this.simulator = null;
    }

    change_menu_state(menu, id_list, state){
        if(menu == 'toolbar' || menu == 'traffic_data'){
            for(let id of id_list){
                document.getElementById(id).disabled = state;
            }
        }
        else if(menu == 'navbar'){
            if(state){
                for(let id of id_list){
                    $(id).addClass('disabled');
                }
                $('#undo').off('click');
                $('#traffic-data-option').off('click');
                $('#play-menu').off('click');
            }
            else{
                for(let id of id_list){
                    $(id).removeClass('disabled');
                }
                $('#undo').click(function(){
                    app.undo();
                });

                $('#traffic-data-option').click(function(){
                    app.view_traffic_data();
                });

                $('#play-menu').click(function(){
                    app.play();
                });
            }
        }

        else if(menu == 'navbar_p_s'){
            if(state){
                for(let id of id_list){
                    $(id).addClass('disabled');
                }
                $('#pause-menu').off('click');
                $('#stop-menu').off('click');
            }
            else{
                for(let id of id_list){
                    $(id).removeClass('disabled');
                }
                $('#pause-menu').click(function(){
                    app.pause();
                });

                $('#stop-menu').click(function(){
                    app.stop();
                });
            }
        }

        else if(menu == 'navbar_play'){
            if(state){
                for(let id of id_list){
                    $(id).addClass('disabled');
                }
                $('play-menu').off('click');
            }
            else{
                for(let id of id_list){
                    $(id).removeClass('disabled');
                }
                $('#play-menu').click(function(){
                    app.play();
                });
            }
        }
    }

    make_canvas(parent, id_){

        let container = document.getElementById(parent);
        var svg = d3.select(container)
            .append("svg")
            .attr("id", id_)
            .attr("width", CANVAS_WIDTH)
            .attr("height", CANVAS_HEIGHT)
            .datum(this);

        return svg;
    }

    clear_canvas(){
        d3.selectAll('path').remove();
        d3.selectAll('circle').remove();
        d3.selectAll('line').remove();
        d3.selectAll('rect').remove();
        d3.selectAll('text').remove();
        d3.selectAll('g').remove();

        let xScale = d3.scaleLinear()
            .domain([0, CANVAS_WIDTH * config.get_px2m_factor()])
            .range([0, CANVAS_WIDTH]);
        let yScale = d3.scaleLinear()
            .domain([-CANVAS_HEIGHT * config.get_px2m_factor(), 0])
            .range([CANVAS_HEIGHT, 0]);
        let xAxis = d3.axisBottom(xScale)
            .ticks(100)
            .tickSize(CANVAS_HEIGHT)
            .tickPadding(8 - CANVAS_HEIGHT);
        let yAxis = d3.axisRight(yScale)
            .ticks(100)
            .tickSize(CANVAS_WIDTH)
            .tickPadding(8 - CANVAS_WIDTH);

        this.guide_canvas.append("g")
            .attr("class", "axis axis--x")
            .call(xAxis);
        this.guide_canvas.append("g")
            .attr("class", "axis axis--y")
            .call(yAxis);
    }

    canvas_find_overlapping(event){
        let ret = [];

        let x = event.clientX;
        let y = event.clientY;

        if(document.elementFromPoint(x, y).__data__ instanceof DLandmark){
            ret.push(document.elementFromPoint(x, y).__data__.item.id);
        }

        let items = document.elementsFromPoint(x, y);

        for(let ctr=0; ctr<items.length; ctr++){
            let item = items[ctr];
            if(item.__data__ && !(item.__data__ instanceof GraphicsContext)){
                if(item.__data__.item){
                    ret.push(item.__data__.item.id);
                }
            }
        }

        return ret;
    }


    get_item_selected(event, all_=false){
        let item_selected = this.canvas_find_overlapping(event);

        if(item_selected){
            if(all_){
                return item_selected;
            }
            else{
                return item_selected[0];
            }
        }
    }

    get_object(event, start=null){
        if(start == null){
            start = this.vars.get('trace_line');
        }
        let item_id = this.get_item_selected(event); // return value must be id

        if(item_id){
            return this.registry.get(item_id);
        }
        else{
            return null;
        }
    }

    left_motion(event){
        let bound = document.getElementById('canvas').getBoundingClientRect();
        let x = event.clientX - bound.left;
        let y = event.clientY - bound.top;

        this.vars.set('lm_point', [x,y]);
        this.state.left_motion(this, this.scene);
    }

    left_press(event){
        if(event.which == 1){

            let canvas = $('#canvas');
            canvas.mousemove(function(event){
                this.__data__.left_motion(event);
            });

            let bound = document.getElementById('canvas').getBoundingClientRect();
            let x = event.clientX - bound.left;
            let y = event.clientY - bound.top;

            this.vars.set('lp_point', [x,y]);
            this.vars.set('cached_item', this.get_object(event));
            this.vars.set('lm_point', null);
            this.vars.set('lr_point', null);
            this.vars.set('rc_point', null);
            this.vars.set('init_pos', null);
            this.vars.set('cached_road', null);
            this.state.left_press(this, this.scene, event);
        }
    }

    left_release(event){
        if(event.which == 1){
            let canvas = $('#canvas');
            canvas.off('mousemove');

            let bound = document.getElementById('canvas').getBoundingClientRect();
            let x = event.clientX - bound.left;
            let y = event.clientY - bound.top;

            this.vars.set('lr_point', [x,y]);
            this.state.left_release(this, this.scene, event);
            this.vars.set('cached_road', null);
            this.vars.set('cached_item', null);
            this.vars.set('init_pos', null);
        }
    }

    right_click(event){
        if(event.which == 3){

            let bound = document.getElementById('canvas').getBoundingClientRect();
            let x = event.clientX - bound.left;
            let y = event.clientY - bound.top;

            this.vars.set('rc_point', [x,y]);
            this.vars.set('cached_item', this.get_object(event));
            this.vars.set('rc_point_root', []); // TODO: event.x_root, event.y_root
            this.vars.set('lp_point', null);
            this.vars.set('lm_point', null);
            this.vars.set('lr_point', null);

            this.state.right_click(this, this.scene, event);
        }
    }

    double_click(event){
        if(event.which == 1){
            let bound = document.getElementById('canvas').getBoundingClientRect();
            let x = event.clientX - bound.left;
            let y = event.clientY - bound.top;

            this.vars.set('lp_point', [x,y]);
            this.vars.set('cached_item', this.get_object(event));
            this.vars.set('lm_point', null);
            this.vars.set('lr_point', null);
            this.vars.set('rc_point', null);
            this.vars.set('init_pos', null);
            this.vars.set('cached_road', null);
            this.state.double_click(this, this.scene, event);
        }
    }

    _bind_mouse(){

        let canvas = $('#canvas');
        canvas.mousedown(function(event){
            this.__data__.left_press(event);
        });

        canvas.mouseup(function(event){
            this.__data__.left_release(event);
        });

        canvas.contextmenu(function(event){
            event.preventDefault();
            this.__data__.right_click(event);
        });

        canvas.dblclick(function(event){
            event.preventDefault();
            this.__data__.double_click(event);
        });
    }

    fix_order(){

    }

    rc_menu_hide(hide_list){
        hide_list.forEach(function(menu){
            menu.addClass('hidden');
        });
    }

    rc_menu_enable(show_list){
        show_list.forEach(function(menu){
            menu.removeClass('hidden');
        });
    }

    show_rc_menu(event, show_list){
        let menu = $('#rc-menu');
        menu.hide();

        let pageX = event.pageX;
        let pageY = event.pageY;

        menu.css({top: pageY , left: pageX});

        let mwidth = menu.width();
        let mheight = menu.height();
        let screenWidth = $(window).width();
        let screenHeight = $(window).height();

        let scrTop = $(window).scrollTop();

        if(pageX+mwidth > screenWidth){
            menu.css({left:pageX-mwidth});
        }

        if(pageY+mheight > screenHeight+scrTop){
            menu.css({top:pageY-mheight});
        }

        let hide_list = [$('#add-split'), $('#remove-split'), $('#delete-road'), $('#delete-control'),
            $('#delete-landmark'), $('#delete-conflict'), $('#properties')];
        this.rc_menu_hide(hide_list);
        this.rc_menu_enable(show_list);

        menu.show();
    }

    delete_(item){
        item.remove();
        this.registry.delete(item.id);
    }

    get_registry_key(obj){
        let keys = this.registry.keys();
        for(let ctr=0; ctr<this.registry.size; ctr++){
            let key = keys.next().value;
            if(this.registry.get(key).object == obj){
                return key;
            }
        }
    }

    simulate(duration, ready=true){
        if(ready){
            this.clock = new Clock(25, duration, 1000);
            this._recolor();
            this.state = app.no_action_control;
        }
        else{
            this.simulator = null;
            this.clock = null;
            this._recolor(false);
            this.state = app.select_control;
        }
    }

    draw_osm(file, width, height){

        d3.selectAll("image").remove();
        if (file) {
            this.guide_canvas.append("image")
                .attr("xlink:href",file)
                .attr("width", width * this.zoom_level)
                .attr("height", height * this.zoom_level)
                .lower();

            this.osm = {image: file, width: width, height: height};
        }
        else {
            this.guide_canvas.append("image")
                .attr("xlink:href", this.osm.image)
                .attr("width", this.osm.width * this.zoom_level)
                .attr("height", this.osm.height * this.zoom_level)
                .lower();
        }

    }

    remove_osm() {
        d3.selectAll("image").remove();
        this.osm = null;
    }

    status_msg(msg){
        app.status_bar.text(msg);
    }

    redraw_gridlines()  {
        this.guide_canvas.selectAll("g").remove();

        let xScale = d3.scaleLinear()
            .domain([0, CANVAS_WIDTH*config.get_px2m_factor()/this.zoom_level])
            .range([0, CANVAS_WIDTH]);
        let yScale = d3.scaleLinear()
            .domain([-CANVAS_HEIGHT*config.get_px2m_factor()/this.zoom_level, 0])
            .range([CANVAS_HEIGHT, 0]);
        let xAxis = d3.axisBottom(xScale)
            .ticks(100)
            .tickSize(CANVAS_HEIGHT)
            .tickPadding(8 - CANVAS_HEIGHT);
        let yAxis = d3.axisRight(yScale)
            .ticks(100)
            .tickSize(CANVAS_WIDTH)
            .tickPadding(8 - CANVAS_WIDTH);

        this.guide_canvas.append("g")
            .attr("class", "axis axis--x")
            .call(xAxis);

        this.guide_canvas.append("g")
            .attr("class", "axis axis--y")
            .call(yAxis);

    }

    _recolor(ready=true){
        let opacity = 1;
        let iroad_fill = IROAD_FILL;

        if(ready){
            opacity = 0;
            iroad_fill = UROAD_FILL;
        }

        for(let dobj of this.registry.values()){
            if(dobj instanceof DNode){
                dobj.item.attr('opacity', opacity);
            }
            else if(dobj instanceof DIRoad){
                dobj.item.style('stroke', iroad_fill);
            }
            else if(dobj instanceof DConflictArea){
                dobj.item.attr('opacity', opacity)
            }
            else if(dobj instanceof DSurveyZone){
                dobj.item.attr('opacity', opacity)
            }
        }
    }

}