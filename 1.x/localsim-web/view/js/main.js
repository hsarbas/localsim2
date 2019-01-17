class Main{
    constructor(){
        this.running = null;
        this.simfile = null;
        this.summary = null;
        this.rand = null;
        this.play_duration = null;
        this.animation_speed = 70;

        this.no_action_control = new NoActionControl();
        this.select_control = new SelectControl();
        this.uroad_create_control = new URoadCreateControl();
        this.iroad_create_control = new IRoadCreateControl();
        this.stopsign_create_control = new StopSignCreateControl();
        this.speed_limit_create_control = new SpeedLimitCreateControl();
        this.type_restriction_create_control = new TypeRestrictionCreateControl();
        this.set_scaling_control = new SetScalingControl();
        this.survey_zone_create_control = new SurveyZoneCreateControl();
        this.stoplight_create_control = new StoplightCreateControl();
        this.set_conflict_area_control = new SetConflictAreaControl();
        this.pt_stop_create_control = new PTStopCreateControl();
        this.landmark_create_control = new LandmarkCreateControl();

        this.gc = null;
        this.toolbar = null;

        this.status_bar = $('#status-bar');

        this.create_uroad_popup = new URoadPopup();
        this.create_iroad_popup = new IRoadPopup();
        this.create_stop_yield_popup = new StopYieldPopup();
        this.create_limit_popup = new SpeedLimitPopup();
        this.create_restrict_popup = new TypeRestrictionPopup();
        this.create_ptstop_popup = new PTStopPopup();
        this.create_stoplight_popup = new StoplightPopup();
        this.create_survey_popup = new DataCollectionPopup();
        this.create_conflict_popup = new ConflictAreaPopup();
        this.match_conflict_popup = new MatchConflictPopup();
        this.create_landmark_popup = new LandmarkPopup();
        this.set_scaling_popup = new SetScalingPopup();
        this.inspect_map_popup = new InspectRoadPopup();
        this.traffic_data_popup = new TrafficDataPopup();
        this.analysis_popup = new AnalysisPopup();
        this.paramaters_popup = new ParametersPopup();
        this.simulation_popup = new SimulationPopup();
        this.play_progress_popup = new PlayProgressPopup();
        this.load_progress_popup = new LoadProgressPopup();
        this.output_popup = new OutputPopup();
        this.save_popup = new SavePopup();

        this.agent_manager = new AgentManager();
        this.data = new Map();

        this.num_requests = 0;
    }

    save(){
        this.save_popup.show(this.gc);
    }

    open_load_dialog(){
        let file_load = $('#file-load');

        file_load.click();
        if (!window.FileReader) {
            alert(FILE_READER_API_ERROR);
        }
    }

    load(event){

        let file_input = document.getElementById('file-load');
        let file_path = file_input.value;
        let file_submit = $('#load-submit');
        let file_ = new FormData(file_submit[0]);
        if(check_valid_lmf(file_input, file_path)){
            $.ajax({url: '/', type: 'POST',
                data: file_,  // The form with the file inputs.
                processData: false  // Using FormData, don't process data.
            })

                .done(function(){
                    if(event.target.files[0]){
                        app._load();
                        file_input.value = '';
                    }
                    else{
                        console.log('No file input for loading.');
                    }
                })

                .fail(function(){
                    console.log("Error: cannot send file");
                });
        }
        else {
            alert(INVALID_LMF);
        }
    }

    _load(){
        this.load_progress_popup.show();
        this.reset_map();

        const ctrl_cls = {'stop': "localsim.models.infra.control.concrete.Stop",
            'yield': 'localsim.models.infra.control.concrete.Yield',
            'speed_limit': 'localsim.models.infra.control.concrete.SpeedLimitZone',
            'stoplight': 'localsim.models.infra.control.concrete.StopLight',
            'bus_terminal_zone': 'localsim.models.infra.control.concrete.BusTerminalZone',
            'type_restriction_zone': 'localsim.models.infra.control.concrete.TypeRestrictionZone'};

        let nodes = new Map();
        let uroads = new Map();
        let iroads = new Map();
        let dispatchers = new Map();
        let controls = new Map();
        let landmarks = new Map();
        let surveys = new Map();
        let routes = new Map();
        let conflict_zones = new Map();

        $.get('tmp/config.json', function(data){
            for(let c of data.head){
                let px2m_factor = c.kws.px2m_factor;

                let desired_velocity = c.kws.desired_velocity;
                let minimum_headway = c.kws.minimum_headway;
                let safe_time_headway = c.kws.safe_time_headway;

                let acceleration_threshold = c.kws.acceleration_threshold;
                let politeness_factor = c.kws.politeness_factor;
                let safe_braking_deceleration = c.kws.safe_braking_deceleration;

                config.set_px2m_factor(px2m_factor);

                config.desired_velocity = desired_velocity;
                config.minimum_headway = minimum_headway;
                config.safe_time_headway = safe_time_headway;

                config.acceleration_threshold = acceleration_threshold;
                config.politeness_factor = politeness_factor;
                config.safe_braking_deceleration = safe_braking_deceleration;
            }
        });

        $.get('tmp/data.json', function(data){
            for(let data_ of data.head){
                console.log(data_);
            }
        });

        $.get('tmp/node.json', function(data){
            for(let node of data.head){

                let x = node.ars[0];
                let y = node.ars[1];
                let dir_ = node.ars[2];

                let node_ = new Node(x, y, dir_);
                nodes.set(node.id, node_);
            }

            $.get('tmp/uroad.json', function(data){
                for(let uroad of data.head){

                    let label = uroad.ars[0];
                    let src_id = uroad.ars[1].id;
                    let src = nodes.get(src_id);
                    let dst_id = uroad.ars[2].id;
                    let dst = nodes.get(dst_id);
                    let lanes = uroad.ars[3];
                    let lane_width = uroad.ars[4];
                    let speed_limit = uroad.ars[5];
                    let priority = uroad.ars[6];
                    let type_ = uroad.ars[7];
                    let z_axis = uroad.ars[8];
                    let split_nodes = [];

                    for(let ctr=9; ctr<uroad.ars.length; ctr++){
                        let bend_id = uroad.ars[ctr].id;
                        let bend = nodes.get(bend_id);
                        split_nodes.push(bend);
                    }

                    let road = new Uninterrupted_Road(label, src, dst, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes);
                    uroads.set(uroad.id, road);
                    app.gc.scene.add_road(road);
                    create_duroad(app.gc, road);

                }

                $.get('tmp/iroad.json', function(data){
                    for(let iroad of data.head){

                        let label = iroad.ars[0];
                        let src_road_id = iroad.ars[1].id;
                        let src_road = uroads.get(src_road_id);
                        let dst_road_id = iroad.ars[2].id;
                        let dst_road = uroads.get(dst_road_id);
                        let src_list = iroad.ars[3];
                        let dst_list = iroad.ars[4];
                        let lanes = iroad.ars[5];
                        let lane_width = iroad.ars[6];
                        let speed_limit = iroad.ars[7];
                        let priority = iroad.ars[8];
                        let type_ = iroad.ars[9];
                        let z_axis = iroad.ars[10];

                        let split_nodes = [];

                        for(let ctr=11; ctr<iroad.ars.length; ctr++){
                            let bend_id = iroad.ars[ctr].id;
                            let bend = nodes.get(bend_id);
                            split_nodes.push(bend);
                        }

                        let road = new Interrupted_Road(label, src_road, dst_road, src_list, dst_list, lanes, lane_width, speed_limit, priority, type_, z_axis, split_nodes);
                        iroads.set(iroad.id, road);
                        app.gc.scene.add_road(road);
                        create_diroad(app.gc, road);
                    }

                    $.get('tmp/dispatcher.json', function(data){
                        for(let dispatcher of data.head){

                            if(dispatcher.ars[0]){
                                let road_id = dispatcher.ars[0].id;
                                let road = uroads.get(road_id);
                                let flow_rates = dispatcher.ars[1];
                                let flow_rates_map = new Map();

                                let dta_matrix = dispatcher.ars[3];
                                let dta_matrix_map = new Map();

                                for(let entry of Object.entries(flow_rates)){
                                    let key = entry[0].split(',');
                                    if(key.length == 2){
                                        flow_rates_map.set([parseInt(key[0]), parseInt(key[1])], entry[1]);
                                    }
                                    else{
                                        break;
                                    }
                                }

                                if(dta_matrix){
                                    for(let key_ of Object.keys(dta_matrix)){
                                        dta_matrix_map.set(key_, parseFloat(dta_matrix[key_]));
                                    }
                                }

                                let dist = dispatcher.ars[2];
                                let obs_matrix = null;
                                if(dist){
                                    obs_matrix = new Map();
                                    if(dist.car){
                                        obs_matrix.set('car', dist.car);
                                    }
                                    else{
                                        obs_matrix.set('car', 0);
                                    }
                                    if(dist.bus){
                                        obs_matrix.set('bus', dist.bus);
                                    }
                                    else{
                                        obs_matrix.set('bus', 0);
                                    }
                                    if(dist.motorcycle){
                                        obs_matrix.set('motorcycle', dist.motorcycle);

                                    }
                                    else{
                                        obs_matrix.set('motorcycle', 0);
                                    }
                                    if(dist.jeep){
                                        obs_matrix.set('jeep', dist.jeep);
                                    }
                                    else{
                                        obs_matrix.set('jeep', 0);
                                    }
                                    if(dist.truck){
                                        obs_matrix.set('truck', dist.truck);
                                    }
                                    else{
                                        obs_matrix.set('truck', 0);
                                    }
                                    if(dist.tricycle){
                                        obs_matrix.set('tricycle', dist.tricycle);
                                    }
                                    else{
                                        obs_matrix.set('tricycle', 0);
                                    }
                                }

                                let dispatcher_ = new Entry(road, flow_rates_map, obs_matrix, dta_matrix_map);
                                dispatchers.set(dispatcher.id, dispatcher_);
                                app.gc.scene.add_dispatcher(dispatcher_);
                            }
                        }

                        $.get('tmp/control.json', function(data){
                            for(let control of data.head){
                                if(control.cls == ctrl_cls.stop){
                                    let road_id = control.ars[0].id;
                                    let road = null;
                                    if(uroads.has(road_id)){
                                        road = uroads.get(road_id);
                                    }
                                    else{
                                        road = iroads.get(road_id);
                                    }
                                    let pos = control.ars[1];
                                    let lane = control.ars[2];

                                    let stop = new Stop(road, pos, lane);
                                    controls.set(control.id, stop);
                                    app.gc.scene.add_control(stop);
                                }

                                else if(control.cls == ctrl_cls.yield){
                                    let road_id = control.ars[0].id;
                                    let road = null;
                                    if(uroads.has(road_id)){
                                        road = uroads.get(road_id);
                                    }
                                    else{
                                        road = iroads.get(road_id);
                                    }
                                    let pos = control.ars[1];
                                    let lane = control.ars[2];

                                    let yield_ = new Yield(road, pos, lane);
                                    controls.set(control.id, yield_);
                                    app.gc.scene.add_control(yield_);
                                }

                                else if(control.cls == ctrl_cls.speed_limit){
                                    let road_id = control.ars[0].id;
                                    let road = null;
                                    if(uroads.has(road_id)){
                                        road = uroads.get(road_id);
                                    }
                                    else{
                                        road = iroads.get(road_id);
                                    }
                                    let pos = control.ars[1];
                                    let lane = control.ars[2];
                                    let zone = control.ars[3];
                                    let limit = control.ars[4];

                                    let speed_limit = new SpeedLimitZone(road, pos, lane, zone, limit);
                                    controls.set(control.id, speed_limit);
                                    app.gc.scene.add_control(speed_limit);
                                }

                                else if(control.cls == ctrl_cls.stoplight){
                                    let road_id = control.ars[0].id;
                                    let road = null;
                                    if(uroads.has(road_id)){
                                        road = uroads.get(road_id);
                                    }
                                    else{
                                        road = iroads.get(road_id);
                                    }
                                    let pos = control.ars[1];
                                    let lane = control.ars[2];
                                    let phase = control.ars[3];
                                    let state = control.kws.state;
                                    let start = control.kws.start;

                                    let stoplight = new StopLight(road, pos, lane, phase, state, start);
                                    controls.set(control.id, stoplight);
                                    app.gc.scene.add_control(stoplight);
                                }

                                else if(control.cls == ctrl_cls.bus_terminal_zone){
                                    let road_id = control.ars[0].id;
                                    let road = null;
                                    if(uroads.has(road_id)){
                                        road = uroads.get(road_id);
                                    }
                                    else{
                                        road = iroads.get(road_id);
                                    }
                                    let pos = control.ars[1];
                                    let lane = control.ars[2];
                                    let zone = control.ars[3];
                                    let label = control.ars[4];
                                    let mean = control.ars[5];
                                    let std_dev = control.ars[6];

                                    let bus_terminal_zone = new BusTerminalZone(road, pos, lane, zone, label, mean, std_dev);
                                    controls.set(control.id, bus_terminal_zone);
                                    app.gc.scene.add_control(bus_terminal_zone);
                                }

                                else if(control.cls == ctrl_cls.type_restriction_zone){
                                    let road_id = control.ars[0].id;
                                    let road = null;
                                    if(uroads.has(road_id)){
                                        road = uroads.get(road_id);
                                    }
                                    else{
                                        road = iroads.get(road_id);
                                    }
                                    let pos = control.ars[1];
                                    let lane = control.ars[2];
                                    let zone = control.ars[3];
                                    let bias = control.ars[4];
                                    let white_list = control.ars[5];

                                    let type_restriction_zone = new TypeRestrictionZone(road, pos, lane, zone, bias, white_list);
                                    controls.set(control.id, type_restriction_zone);
                                    app.gc.scene.add_control(type_restriction_zone);
                                }
                            }

                            for(let uroad of app.gc.scene.uroads){
                                if(!app.gc.scene.controls.has(uroad)){
                                    app.gc.scene.controls.set(uroad, []);
                                }
                                for(let control of app.gc.scene.controls.get(uroad)){
                                    if(control instanceof Stop){
                                        create_dstop(app.gc, control);
                                    }
                                    else if(control instanceof Yield){
                                        create_dyield(app.gc, control);
                                    }
                                    else if(control instanceof SpeedLimitZone){
                                        create_dspeed_limit(app.gc, control);
                                    }
                                    else if(control instanceof StopLight){
                                        create_dstoplight(app.gc, control);
                                    }
                                    else if(control instanceof BusTerminalZone){
                                        create_dpt_stop(app.gc, control);
                                    }
                                    else if(control instanceof TypeRestrictionZone){
                                        create_dtype_restriction(app.gc, control);
                                    }
                                }
                            }

                            for(let iroad of app.gc.scene.iroads){
                                if(!app.gc.scene.controls.has(iroad)){
                                    app.gc.scene.controls.set(iroad, []);
                                }
                                for(let control of app.gc.scene.controls.get(iroad)){
                                    if(control instanceof Stop){
                                        create_dstop(app.gc, control);
                                    }
                                    else if(control instanceof Yield){
                                        create_dyield(app.gc, control);
                                    }
                                    else if(control instanceof SpeedLimitZone){
                                        create_dspeed_limit(app.gc, control);
                                    }
                                    else if(control instanceof StopLight){
                                        create_dstoplight(app.gc, control);
                                    }
                                    else if(control instanceof BusTerminalZone){
                                        create_dpt_stop(app.gc, control);
                                    }
                                    else if(control instanceof TypeRestrictionZone){
                                        create_dtype_restriction(app.gc, control);
                                    }
                                }
                            }

                            $.get('tmp/route.json', function(data){
                                for(let route of data.head){

                                    let road_id = route.ars[0].id;
                                    let uroad = null;
                                    if(uroads.has(road_id)){
                                        uroad = uroads.get(road_id);
                                    }
                                    let exits_ = route.ars[1];
                                    let exits = [];
                                    for(let exit of exits_){
                                        exits.push(iroads.get(exit.id));
                                    }
                                    let obs_matrix = null;
                                    let dist = route.ars[2];
                                    if(dist){


                                        let dist_car = new Map();
                                        for(let car_entry of Object.entries(dist.car)){
                                            dist_car.set(car_entry[0], car_entry[1]);
                                        }

                                        let dist_bus = new Map();
                                        for(let bus_entry of Object.entries(dist.bus)){
                                            dist_bus.set(bus_entry[0], bus_entry[1]);
                                        }

                                        let dist_motorcycle = new Map();
                                        for(let motorcycle_entry of Object.entries(dist.motorcycle)){
                                            dist_motorcycle.set(motorcycle_entry[0], motorcycle_entry[1]);
                                        }

                                        let dist_jeep = new Map();

                                        if(dist.jeep){
                                            for(let jeep_entry of Object.entries(dist.jeep)){
                                                dist_jeep.set(jeep_entry[0], jeep_entry[1]);
                                            }
                                        }
                                        else{
                                            for(let bus_entry of Object.entries(dist.bus)){
                                                dist_jeep.set(bus_entry[0], bus_entry[1]);
                                            }
                                        }

                                        let dist_truck = new Map();
                                        if(dist.truck){
                                            for(let truck_entry of Object.entries(dist.truck)){
                                                dist_truck.set(truck_entry[0], truck_entry[1]);
                                            }
                                        }
                                        else{
                                            for(let bus_entry of Object.entries(dist.bus)){
                                                dist_truck.set(bus_entry[0], bus_entry[1]);
                                            }
                                        }

                                        let dist_tricycle = new Map();
                                        if(dist.tricycle){
                                            for(let tricycle_entry of Object.entries(dist.tricycle)){
                                                dist_tricycle.set(tricycle_entry[0], tricycle_entry[1]);
                                            }
                                        }
                                        else{
                                            for(let tricycle_entry of Object.entries(dist.motorcycle)){
                                                dist_tricycle.set(tricycle_entry[0], tricycle_entry[1]);
                                            }
                                        }

                                        obs_matrix = new Map();
                                        obs_matrix.set('car', dist_car);
                                        obs_matrix.set('bus', dist_bus);
                                        obs_matrix.set('motorcycle', dist_motorcycle);
                                        obs_matrix.set('jeep', dist_jeep);
                                        obs_matrix.set('truck', dist_truck);
                                        obs_matrix.set('tricycle', dist_tricycle);

                                    }
                                    let onset = route.kws.onset;
                                    let emergency_stop = route.kws.emergency_stop;
                                    let offset = route.kws.offset;

                                    let route_ = new Route(uroad, exits, obs_matrix, onset, emergency_stop, offset);
                                    routes.set(route.id, route_);
                                    app.gc.scene.add_route(route_);
                                }

                                $.get('tmp/surveyor.json', function(data){
                                    for(let survey of data.head){

                                        let road_id = survey.ars[0].id;
                                        let road = null;
                                        if(uroads.has(road_id)){
                                            road = uroads.get(road_id);
                                        }
                                        else{
                                            road = iroads.get(road_id);
                                        }
                                        let pos = survey.ars[1];
                                        let lane = survey.ars[2];
                                        let zone = survey.ars[3];
                                        let type_ = survey.ars[4];

                                        let survey_zone = new SurveyZone(road, pos, lane, zone, type_);
                                        surveys.set(survey.id, survey_zone);
                                        app.gc.scene.add_surveyor(survey_zone);
                                        create_dsurvey_zone(app.gc, survey_zone);
                                    }

                                    $.get('tmp/conflict_zone.json', function(data){
                                        for(let conflict of data.head){
                                            if(conflict.ars[0]){
                                                let road_id = conflict.ars[0].id;
                                                let road = iroads.get(road_id);
                                                let pos = conflict.ars[1];
                                                let lane = conflict.ars[2];
                                                let length = conflict.ars[3];
                                                let width = conflict.ars[4];
                                                let conflict_group = conflict.ars[5];
                                                let type_ = conflict.ars[6];

                                                if(pos > road.length){
                                                    pos = 0;
                                                }
                                                let conflict_zone = new ConflictArea(road, pos, lane, length, width, conflict_group, type_);
                                                conflict_zones.set(conflict.id, conflict_zone);
                                                app.gc.scene.add_conflict_zone(conflict_zone);
                                            }
                                        }

                                        for(let iroad of app.gc.scene.iroads){
                                            if(app.gc.scene.conflict_zones.has(iroad)){
                                                for(let conflict_ of app.gc.scene.conflict_zones.get(iroad)){
                                                    create_dconflict_area(app.gc, conflict_);
                                                }
                                            }
                                        }

                                        app.load_progress_popup.hide();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        $.get('tmp/landmark.json', function(data){
            for(let landmark of data.head){
                let x = landmark.ars[0];
                let y = landmark.ars[1];
                let size = landmark.ars[2];
                let label = landmark.ars[3];
                let angle = landmark.ars[4];

                let landmark_ = new Landmark(x, y, size, label, angle);
                landmarks.set(landmark.id, landmark_);
                app.gc.scene.add_landmark(landmark_);
                create_dlandmark(app.gc, landmark_);
            }
        });
    }

    play(){
        if(this.running == null){
            for(let button of this.toolbar.button_list){
                if(button.is_active){
                    button.click();
                }
            }
            this.simulation_popup.show(this.gc);
        }
        else if(!this.running){
            this.running = true;
            this.gc.change_menu_state(NAVBAR_PAUSE_STOP, PAUSE_STOP, ENABLED);
            this.gc.change_menu_state(NAVBAR_PLAY, PLAY, DISABLED);
            this._play();
        }
    }

    _play(){
        if(this.running){
            if(this.gc.animated){
                this.agent_manager.actual_clock.step();

                let time = this.gc.clock.step();
                if(time && time <= this.play_duration){
                    try{
                        if(time % 1000 == 0){
                            console.log('[Animation] Sim time: ', (time/1000));
                        }

                        if(time % 100 == 0){
                            this.status_bar.text('[Animation] Time (s): ' + (time/100));
                        }

                        let agents = this.data.get(time.toString());
                        let temp_list = [];

                        for(let a of agents){

                            let type_ = a.type;
                            let id_ = a.id;
                            let road_ = a.road;
                            let pos_ = a.pos;
                            let lane_ = a.lane;
                            let lc_delay_ = a.lc_delay;
                            let lc_dest_dir_ = a.lc_dest_dir;
                            //let lc_state_ = a.lc_state;
                            let lc_state_ = null;

                            let road = this.gc.scene.get_road_by_label(road_);
                            temp_list.push(id_);

                            if(this.agent_manager.agents.has(id_)){
                                this.agent_manager.update_agent(id_, road, pos_, lane_, lc_delay_, lc_dest_dir_, lc_state_);
                            }

                            else{
                                let agent = null;
                                if(type_ == 'car'){
                                    agent = new Car(id_, road, pos_, lane_);
                                }
                                else if(type_ == 'bus'){
                                    agent = new Bus(id_, road, pos_, lane_);
                                }
                                else if(type_ == 'motorcycle'){
                                    agent = new Motorcycle(id_, road, pos_, lane_);
                                }
                                else if(type_ == 'jeep'){
                                    agent = new Jeep(id_, road, pos_, lane_);
                                }
                                else if(type_ == 'truck'){
                                    agent = new Truck(id_, road, pos_, lane_);
                                }
                                else if(type_ == 'tricycle'){
                                    agent = new Tricycle(id_, road, pos_, lane_);
                                }
                                this.agent_manager.add_agent(agent);
                                new DAgent(this.gc, agent);
                                }
                        }

                        for(let k of this.agent_manager.agents.keys()){
                            if(! temp_list.includes(k)){
                                this.agent_manager.delete_agent(k);
                            }
                        }
                        setTimeout(this._play.bind(this), this.animation_speed);
                    }catch (TypeError){
                        this.from_server_POST();
                    }
                }else {
                    this.stop()
                }
            }
            else{
                let time  = this.data.get('time');
                this.status_bar.text('[No Animation] Time (s): ' + time.toString());

                if(time < this.play_duration/100){
                    this.from_server_POST();
                }
                else{
                    this.stop();
                }
            }
        }
    }

    pause(){
        if(this.running){
            this.running = false;
            console.log('Animation paused');

            this.gc.change_menu_state(NAVBAR_PLAY, PLAY, ENABLED);
        }
    }

    stop(){
        $('.modal-backdrop').remove();
        app.output_popup.show();
        this.gc.change_menu_state(TOOLBAR, TOOLBAR_BUTTONS, ENABLED);
        this.gc.change_menu_state(NAVBAR, NAV_DISABLE_ON_PLAY, ENABLED);
        this.gc.change_menu_state(NAVBAR_PAUSE_STOP, PAUSE_STOP, DISABLED);
        this.gc.simulate(0, false);
        this.running = null;
        this.agent_manager.reset();
        this.data.clear();
        this.play_duration = null;

        $.ajax({
            type: 'POST',
            url:'/main.html',
            data: 'STOP'
        }).done(function(data) {
            
            })
    }

    change_scaling(){
        this.gc.state = this.set_scaling_control;
    }

    inspect_road(){
        this.inspect_map_popup.show(this.gc);
    }

    view_traffic_data(){
        this.traffic_data_popup.show(this.gc);
    }

    reset_map(){
        this.gc.reset();

        this.running = null;

        this.set_default_state();
    }

    set_default_state(){
        this.gc.state = this.toolbar.default_control;
        this.toolbar.reset_state();
    }

    open_import_guide_dialog(){
        let osm_load = $('#import-osm-load');

        osm_load.click();
        if (!window.FileReader) {
            alert(FILE_READER_API_ERROR);
        }
    }

    import_osm(event){
        let file_input = document.getElementById('import-osm-load');
        let file_path = file_input.value;

        if(check_valid_osm(file_input, file_path)){
            let file = URL.createObjectURL(event.target.files[0]);

            if (file){
                this.remove_osm();
                let img = new Image();
                img.src =   file;
                img.onload = function () {
                    app.gc.draw_osm(file, this.width, this.height);
                };
            }

            file_input.value = '';
        }
        else {
            alert(INVALID_GUIDE);
        }
    }

    remove_osm(){
        this.gc.remove_osm();
    }

    keypress_callback(e){
        if(e.which == ESC_KEY){
            for(let button of this.toolbar.button_list){
                if(button.is_active){
                    button.click();
                }
            }
        }
        else if(e.which == P_KEY){
            this.play();
        }
        else if(e.which == L_KEY){
            this.open_load_dialog();
        }
        else if(e.which == S_KEY){
            this.stop();
        }
        else if(e.which == N_KEY){
            this.reset_map();
        }
        else if(e.which == U_KEY){
            this.undo();
        }
        else if(e.which == G_KEY){
            this.open_import_guide_dialog();
        }
        else if(e.which == T_KEY){
            this.view_traffic_data();
        }
        else if(e.which == ONE_KEY){
            this.toolbar.button_list[0].click();
        }
        else if(e.which == TWO_KEY){
            this.toolbar.button_list[1].click();
        }
        else if(e.which == THREE_KEY){
            this.toolbar.button_list[2].click();
        }
    }

    scale_fix(){

    }

    view_parameters(){
        let desired_velocity = config.desired_velocity;
        let minimum_headway = config.minimum_headway;
        let safe_time_headway = config.safe_time_headway;

        let acceleration_threshold = config.acceleration_threshold;
        let politeness_factor = config.politeness_factor;
        let safe_braking_deceleration = config.safe_braking_deceleration;

        this.paramaters_popup.show(this.gc, desired_velocity, minimum_headway, safe_time_headway,
            acceleration_threshold, politeness_factor, safe_braking_deceleration);
    }

    glue_code(animated, runs, duration){
        this.play_duration = duration;
        this.gc.animated = animated;
        this.gc.simulate(duration);
        this.running = true;

        this.send_to_server(duration);
        for(let c_list of app.gc.scene.controls.values()){
            for(let c of c_list){
                if(c instanceof StopLight){
                    c.run(app.agent_manager.actual_clock);
                }
            }
        }
        setTimeout(app.from_server_POST, 1000);
        
    }

    send_to_server(duration){
        this.rand = random_unique();
        this.gc.scene.serial_play(duration, this.gc.animated, this.rand);
        console.log('Server is simulating...');
    }

    from_server_INIT(){
        $.ajax({
            type: 'POST',
            url:'/main.html',
            data: 'STEP'
        }).done(function(data) {
            $('.modal-backdrop').remove();
            if ((data != '{}')){
                app.data.clear();
                app.simfile = data;
                app.data = app._buildMap(JSON.parse(app.simfile));
                if(app.play_progress_popup.modal){
                    app.play_progress_popup.hide();
                }

                app._play();
            }
            else{
                if(app.play_progress_popup.modal){
                    app.play_progress_popup.hide();
                }
                app.play_progress_popup.show();
                setTimeout(app.from_server_POST, 10000);
            }

        }).fail(function(data){
            console.log('Server is still initializing...');
            app.from_server_INIT();
        });
    }

    from_server_POST(){
        $.ajax({
            type: 'POST',
            url:'/main.html',
            data: 'STEP ' + this.rand
        }).done(function(data) {
            $('.modal-backdrop').remove();
            if ((data != '{}')){
                app.data.clear();
                app.simfile = data;
                app.data = app._buildMap(JSON.parse(app.simfile));
                if(app.play_progress_popup.modal){
                    app.play_progress_popup.hide();
                }
                app._play();
            }
            else{
                // if(app.play_progress_popup.modal){
                //     app.play_progress_popup.hide();
                // }
                // app.play_progress_popup.show();

                setTimeout(app.from_server_POST, 1000);
                // app.from_server_POST();
            }
        }).fail(function(data){
            app.from_server_POST();
        });
    }

    logout(){
        if(confirm("Are you sure you want to log out?")){
            location.href = "index.html";
        }
    }

    _buildMap(obj) {
        let map = new Map();
        Object.keys(obj).forEach(key => {map.set(key, obj[key]);});
    return map;
    }

    undo(){
        if(confirm("Undo action?")){
            this.gc.undo();
        }
    }

    zoom(new_zoom_level){
        this.gc.zoom_level = new_zoom_level;
        this.gc.redraw_gridlines();

        for (let v of this.gc.registry) {
            if(v[1] != 'lane_marking'){
                this.gc.registry.get(v[0]).move();
                if (['DURoad', 'DIRoad'].includes(this.gc.registry.get(v[0]).constructor.name)){
                    this.gc.registry.get(v[0])._move_lane_markings();
                }
            }
        }
        if (this.gc.osm)   {
            this.gc.draw_osm(null);
        }

    }

    change_animation_speed(new_animation_speed){
        this.animation_speed = 510 - new_animation_speed;
    }

}