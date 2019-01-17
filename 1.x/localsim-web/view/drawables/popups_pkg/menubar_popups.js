class InspectRoadPopup{
    constructor(){

    }

    show(gc){
        this.gc = gc;
        this.modal = $('#inspect-map');

        this.inspect_uroads = $('#inspect-uroads');
        this.inspect_uroads.empty();

        let road_list = [];
        for(let ctr=0; ctr<this.gc.scene.uroads.length; ctr++){
            let uroad = this.gc.scene.uroads[ctr];
            road_list.push(uroad.label);
        }
        this.populate_list(road_list, 'uroad');

        this.inspect_iroads = $('#inspect-iroads');
        this.inspect_iroads.empty();

        road_list = [];
        for(let ctr=0; ctr<this.gc.scene.iroads.length; ctr++){
            let iroad = this.gc.scene.iroads[ctr];
            road_list.push(iroad.label);
        }
        this.populate_list(road_list, 'iroad');

        this.modal.modal();
    }

    on_double_click(value){
        let road = this.gc.scene.get_road_by_label(value);

        if(road instanceof Uninterrupted_Road){

            edit_uroad(this.gc, this.gc.scene, road);
        }
        else{
            edit_iroad(this.gc, this.gc.scene, road);
        }
        this.modal.modal('hide');
    }

    populate_list(list_, type){
            for(let ctr=0; ctr<list_.length; ctr++){
            let option = document.createElement('option');
            option.innerHTML = list_[ctr];
            if(type == 'uroad'){
                this.inspect_uroads.append(option, list_[ctr]);
            }
            else{
                this.inspect_iroads.append(option, list_[ctr]);
            }
        }
    }

    get_index(){

    }

    notebook_tab_changed(){

    }

    select_road(){

    }

    on_select(value){
        this.reset_colors();

        let road = this.gc.scene.get_road_by_label(value);
        if(road){
            let dkey = this.gc.get_registry_key(road);
            let dobj = this.gc.registry.get(dkey);

            dobj.item.style('stroke', '#6487A5');
        }
    }

    on_exit(){

    }

    clear_previous(){

    }

    reset_colors(){
        for(let ctr=0; ctr<this.gc.scene.uroads.length; ctr++){
            let road = this.gc.scene.uroads[ctr];
            let dkey = this.gc.get_registry_key(road);
            let droad = this.gc.registry.get(dkey);
            droad.item.style('stroke', UROAD_FILL);
        }

        for(let ctr=0; ctr<this.gc.scene.iroads.length; ctr++){
            let road = this.gc.scene.iroads[ctr];
            let dkey = this.gc.get_registry_key(road);
            let droad = this.gc.registry.get(dkey);
            droad.item.style('stroke', IROAD_FILL);
        }
    }
}

class TrafficDataPopup{
    constructor(){

    }

    show(gc){
        this.gc = gc;
        this.scene = gc.scene;
        this.modal = $('#traffic-data');

        this.entry_roads_option = $('#traffic-data-entry-roads');
        this.entry_roads_option.empty();

        this.entry_intervals = $('#traffic-data-entry-intervals');
        this.interval_input = $('#traffic-data-entry-interval-input');
        this.interval_select = $('#traffic-data-entry-interval-select');
        this.curr_time = 0;

        this.entry_save = $('#traffic-data-entry-save');
        this.entry_dump = $('#traffic-data-entry-dump');

        this.entry_type_dist_car = $('#traffic-data-type-car');
        this.entry_type_dist_bus = $('#traffic-data-type-bus');
        this.entry_type_dist_motorcycle = $('#traffic-data-type-motorcycle');
        this.entry_type_dist_jeep = $('#traffic-data-type-jeep');
        this.entry_type_dist_truck = $('#traffic-data-type-truck');
        this.entry_type_dist_tricycle = $('#traffic-data-type-tricycle');
        this.tf_current = null;

        if(this.scene.routing_mode == DYNAMIC_ROUTING){
            document.getElementById('traffic-data-matrix-assignment-dynamic').checked = true;
            this.gc.change_menu_state(TRAFFIC_DATA, STATIC_ROUTING_BUTTONS, DISABLED);
            this.gc.change_menu_state(TRAFFIC_DATA, DYNAMIC_ROUTING_BUTTONS, ENABLED);
        }
        else{
            document.getElementById('traffic-data-matrix-assignment-static').checked = true;
            this.gc.change_menu_state(TRAFFIC_DATA, STATIC_ROUTING_BUTTONS, ENABLED);
            this.gc.change_menu_state(TRAFFIC_DATA, DYNAMIC_ROUTING_BUTTONS, DISABLED);
        }

        this.matrix_roads_option = $('#traffic-data-matrix-roads');
        this.matrix_roads_option.empty();
        this.matrix_onset = $('#traffic-data-matrix-onset');
        this.matrix_dump = $('#traffic-data-matrix-dump');

        this.matrix_dist_car = $('#traffic-data-matrix-dist-car');
        this.matrix_dist_bus = $('#traffic-data-matrix-dist-bus');
        this.matrix_dist_motorcycle = $('#traffic-data-matrix-dist-motorcycle');
        this.matrix_dist_jeep = $('#traffic-data-matrix-dist-jeep');
        this.matrix_dist_truck = $('#traffic-data-matrix-dist-truck');
        this.matrix_dist_tricycle = $('#traffic-data-matrix-dist-tricycle');

        this.matrix_dynamic_dist = $('#traffic-data-matrix-dynamic-dist');

        this.rd_current = null;

        // for flow rate distribution
        for(let ctr=0; ctr<this.scene.entry_roads().length; ctr++){
            let road = this.scene.entry_roads()[ctr];
            let option = document.createElement('option');
            option.value = ctr;
            option.innerHTML = road.label;
            this.entry_roads_option.append(option, road.label);
        }

        // for routing distribution
        if(this.scene.routing_mode == STATIC_ROUTING){
            this.populate_static_routing_roads_list();
        }
        else{
            this.populate_dynamic_routing_roads_list();
        }

        this.matrix_onset.val('');

        this._clear_flow_rates();
        this._clear_demands();
        this._clear_dynamic_dist();

        this.gc.change_menu_state(TRAFFIC_DATA, TRAFFIC_DATA_OPTIONS, DISABLED);
        this.gc.change_menu_state(TRAFFIC_DATA, STATIC_ROUTING_BUTTONS, DISABLED);
        this.gc.change_menu_state(TRAFFIC_DATA, DYNAMIC_ROUTING_BUTTONS, DISABLED);
        this.modal.modal();
    }

    populate_static_routing_roads_list(){
        this.matrix_roads_option.empty();
        for(let ctr=0; ctr<this.scene.routable_roads().length; ctr++){
            let road = this.scene.routable_roads()[ctr];
            let route = this.scene.routes.get(this.scene.get_road_by_label(road.label));

            if(route.get_exits().length > 1){
                let option = document.createElement('option');
                option.value = ctr;
                option.innerHTML = road.label;
                this.matrix_roads_option.append(option, road.label);
            }
        }
    }

    populate_dynamic_routing_roads_list(){
        this.matrix_roads_option.empty();
        for(let ctr=0; ctr<this.scene.entry_roads().length; ctr++){
            let road = this.scene.entry_roads()[ctr];

            // if(!this.scene.exit_roads().includes(road)){
                let option = document.createElement('option');
                option.value = ctr;
                option.innerHTML = road.label;
                this.matrix_roads_option.append(option, road.label);
            // }
        }
    }

    _clear_flow_rates(){
        let flow_rates = document.getElementById("traffic-data-entry-intervals");
        while(flow_rates.firstChild){
            flow_rates.removeChild(flow_rates.firstChild);
        }
    }

    _clear_dynamic_dist(){
        let row = document.getElementById("traffic-data-matrix-dynamic-dist");
        while(row.firstChild){
            row.removeChild(row.firstChild);
        }
    }

    _clear_demands(){
        let _car = document.getElementById("traffic-data-matrix-dist-car");
        while (_car.firstChild) {
            _car.removeChild(_car.firstChild);
        }

        let _bus = document.getElementById("traffic-data-matrix-dist-bus");
        while (_bus.firstChild) {
            _bus.removeChild(_bus.firstChild);
        }

        let _motorcycle = document.getElementById("traffic-data-matrix-dist-motorcycle");
        while (_motorcycle.firstChild) {
            _motorcycle.removeChild(_motorcycle.firstChild);
        }

        let _tricycle = document.getElementById("traffic-data-matrix-dist-tricycle");
        while (_tricycle.firstChild) {
            _tricycle.removeChild(_tricycle.firstChild);
        }

        let _jeep = document.getElementById("traffic-data-matrix-dist-jeep");
        while (_jeep.firstChild) {
            _jeep.removeChild(_jeep.firstChild);
        }

        let _truck = document.getElementById("traffic-data-matrix-dist-truck");
        while (_truck.firstChild) {
            _truck.removeChild(_truck.firstChild);
        }
    }

    on_tf_select(){
        this._clear_flow_rates();
        let dispatcher = null;
        this.curr_time = 0;

        if(this.entry_roads_option.val() != null){
            this.tf_current = this.entry_roads_option.val();
            let uroad = this.scene.entry_roads()[this.tf_current];
            if(this.scene.dispatcher.has(uroad)){
                dispatcher = this.scene.dispatcher.get(uroad);
                let flow_rates = dispatcher.get_flow_rates();
                if(flow_rates){
                    for(let key of flow_rates.keys()){
                        let flow_rate = parseInt(flow_rates.get(key)[1] * uroad.get_lanes() * 3600);
                        let vehicle_count = parseInt(flow_rates.get(key)[0]);
                        this.tf_add_option(key, vehicle_count, flow_rate, 1);
                    }
                }
            }

            this.entry_save.text('Save flow rate for ' + "'" + uroad.label + "'");

            if(dispatcher && dispatcher.obs_matrix){
                this.entry_type_dist_car.val(dispatcher.obs_matrix.get('car'));
                this.entry_type_dist_bus.val(dispatcher.obs_matrix.get('bus'));
                this.entry_type_dist_motorcycle.val(dispatcher.obs_matrix.get('motorcycle'));
                this.entry_type_dist_jeep.val(dispatcher.obs_matrix.get('jeep'));
                this.entry_type_dist_truck.val(dispatcher.obs_matrix.get('truck'));
                this.entry_type_dist_tricycle.val(dispatcher.obs_matrix.get('tricycle'));
            }
            else{
                this.entry_type_dist_car.val(CAR_DEFAULT_DIST);
                this.entry_type_dist_bus.val(BUS_DEFAULT_DIST);
                this.entry_type_dist_motorcycle.val(MOTORCYCLE_DEFAULT_DIST);
                this.entry_type_dist_jeep.val(JEEP_DEFAULT_DIST);
                this.entry_type_dist_truck.val(TRUCK_DEFAULT_DIST);
                this.entry_type_dist_tricycle.val(TRICYCLE_DEFAULT_DIST);
            }

            this.gc.change_menu_state(TRAFFIC_DATA, TRAFFIC_DATA_OPTIONS, ENABLED);
        }
    }

    on_tf_update(){
        let car_dist = this.entry_type_dist_car.val();
        let bus_dist = this.entry_type_dist_bus.val();
        let motorcycle_dist = this.entry_type_dist_motorcycle.val();
        let tricycle_dist = this.entry_type_dist_tricycle.val();
        let jeep_dist = this.entry_type_dist_jeep.val();
        let truck_dist = this.entry_type_dist_truck.val();

        if(this.check_valid_dist(car_dist, bus_dist, motorcycle_dist, tricycle_dist, jeep_dist, truck_dist)){
            let uroad = this.scene.entry_roads()[this.tf_current];
            let dispatcher = this.scene.dispatcher.get(uroad);

            let new_matrix = new Map();
            new_matrix.set('car', parseFloat(car_dist));
            new_matrix.set('bus', parseFloat(bus_dist));
            new_matrix.set('motorcycle', parseFloat(motorcycle_dist));
            new_matrix.set('tricycle', parseFloat(tricycle_dist));
            new_matrix.set('jeep', parseFloat(jeep_dist));
            new_matrix.set('truck', parseFloat(truck_dist));

            dispatcher.update_matrix(new_matrix);

            alert('Agent type distribution for ' + uroad.label + ' saved!');
        }

        else{
            alert('Invalid distribution! Total must be equal to 1.0');
            this.entry_type_dist_car.focus();
        }
    }

    check_valid_dist(car_dist, bus_dist, motorcycle_dist, tricycle_dist, jeep_dist, truck_dist){
        return check_float(car_dist) && check_float(bus_dist) && check_float(motorcycle_dist) && check_float(jeep_dist)
            && check_float(truck_dist) && check_float(tricycle_dist) &&

            car_dist>=0 && bus_dist>=0 && motorcycle_dist>=0 && jeep_dist>=0 && truck_dist>=0 && motorcycle_dist>=0 &&

            Math.abs((parseFloat(car_dist) + parseFloat(bus_dist) + parseFloat(motorcycle_dist) +
            parseFloat(jeep_dist) + parseFloat(truck_dist) + parseFloat(tricycle_dist)) - 1.0) < 0.0001;
    }

    on_tf_default(){
        let uroad = this.scene.entry_roads()[this.tf_current];
        let dispatcher = this.scene.dispatcher.get(uroad);

        dispatcher.update_matrix(null);

        this.entry_type_dist_car.val(CAR_DEFAULT_DIST);
        this.entry_type_dist_bus.val(BUS_DEFAULT_DIST);
        this.entry_type_dist_motorcycle.val(MOTORCYCLE_DEFAULT_DIST);
        this.entry_type_dist_tricycle.val(TRICYCLE_DEFAULT_DIST);
        this.entry_type_dist_jeep.val(JEEP_DEFAULT_DIST);
        this.entry_type_dist_truck.val(TRUCK_DEFAULT_DIST);

        alert('Agent type distribution for ' + uroad.label + ' has been set to default!');

    }

    tf_add_option(time=null, vehicle_count=null, flow_rate=null, interval=null){
        let interval_input = parseInt(this.interval_input.val());

        if(interval != null){
            this.interval_input.val(interval);
            interval_input = interval;
        }

        let interval_select = this.interval_select.val();
        let s_multiplier = null;
        if(interval_select == 'min'){
            s_multiplier = 60;

        }
        else{
            s_multiplier = 3600;
        }
        if( Number.isInteger(interval_input) && check_int(interval_input) && interval_input>0){
            interval_input = parseInt(this.interval_input.val()) * s_multiplier;
            this.interval_s = interval_input;

            let time_label_0 = document.createElement("label");
            let time_label_1 = document.createElement("label");

            if(time != null){
                let time_copy = time.slice();
                time_label_0.setAttribute('data', String(time_copy[0]));

                let hr = Math.floor(time_copy[0] / 3600);
                time_copy[0] -= hr * 3600;
                let min = Math.floor(time_copy[0] / 60);

                if(hr < 10){
                    hr = '0' + String(hr);
                }
                if(min < 10){
                    min = '0' + String(min);
                }
                time_label_0.innerHTML = String(hr) + ':' + String(min);

                time_label_1.setAttribute('data', String(time_copy[1]));

                hr = Math.floor(time_copy[1] / 3600);
                time_copy[1] -= hr * 3600;
                min = Math.floor(time_copy[1] / 60);

                if(hr < 10){
                    hr = '0' + String(hr);
                }
                if(min < 10){
                    min = '0' + String(min);
                }
                time_label_1.innerHTML = String(hr) + ':' + String(min);
            }
            else{
                time_label_0.setAttribute('data', String(this.curr_time));

                let hr = Math.floor(this.curr_time / 3600);
                this.curr_time -= hr * 3600;
                let min = Math.floor(this.curr_time / 60);

                if(hr < 10){
                    hr = '0' + String(hr);
                }
                if(min < 10){
                    min = '0' + String(min);
                }
                time_label_0.innerHTML = String(hr) + ':' + String(min);


                let new_time = parseInt(time_label_0.getAttribute('data')) + interval_input;
                time_label_1.setAttribute('data', String(new_time));

                hr = Math.floor(new_time / 3600);
                new_time -= hr * 3600;
                min = Math.floor(new_time / 60);

                if(hr < 10){
                    hr = '0' + String(hr);
                }
                if(min < 10){
                    min = '0' + String(min);
                }
                time_label_1.innerHTML = String(hr) + ':' + String(min);
            }

            this.curr_time = parseInt(time_label_1.getAttribute('data'));

            let dash_label = document.createElement("label");
            dash_label.className = 'colon';
            dash_label.innerHTML = '-';

            let colon_label_1 = document.createElement("label");
            colon_label_1.className = 'colon';
            colon_label_1.innerHTML = ':';

            let vehicle_count_input = document.createElement("input");
            if(vehicle_count != null){
                vehicle_count_input.value = vehicle_count;
            }

            let colon_label_2 = document.createElement("label");
            colon_label_2.className = 'colon';
            colon_label_2.innerHTML = ':';

            let flow_input = document.createElement("input");
            flow_input.setAttribute('disabled', 'true');
            if(flow_rate != null){
                flow_input.value = flow_rate;
            }

            let row = document.createElement("row");
            row.setAttribute('class', 'row');

            row.append(time_label_0);
            row.append(dash_label);
            row.append(time_label_1);
            row.append(colon_label_1);
            row.append(vehicle_count_input);
            row.append(colon_label_2);
            row.append(flow_input);

            this.entry_intervals.append(row);
        }
        else{
            alert(INTERVAL_INT_TIME_ERROR);
            this.interval_input.focus();
        }
    }

    tf_delete_option(){
        let flow_rates = document.getElementById("traffic-data-entry-intervals");
        if(flow_rates.hasChildNodes()){
            flow_rates.removeChild(flow_rates.lastChild);
            if(flow_rates.hasChildNodes()){
                this.curr_time = parseInt(flow_rates.lastChild.childNodes[2].getAttribute('data'));
            }
            else{
                this.curr_time = 0;
            }

        }
    }

    tf_save_option(){
        let intervals = new Map();
        let uroad = this.scene.entry_roads()[this.tf_current];

        let flow_rates = document.getElementById("traffic-data-entry-intervals");
        let rows = flow_rates.children;

        for(let row of rows){
            let time_0 = row.children[0].getAttribute('data');
            let time_1 = row.children[2].getAttribute('data');
            let time = [parseInt(time_0), parseInt(time_1)];
            let vehicle_count = row.children[4].value;

            let hfr = (3600 / (time[1] - time[0])) * vehicle_count;
            row.children[6].value = hfr;
            let flow_rate = (parseFloat(hfr) / uroad.get_lanes()) / 3600;
            intervals.set(time, [parseInt(vehicle_count), parseFloat(flow_rate)]);
        }

        let valid = this.valid_flow_rate(intervals, uroad.get_lanes());
        if(valid[0]){
            this.scene.dispatcher.get(uroad).set_flow_rates(intervals);
            alert(FLOW_RATE_SUCCESS);
        }
        else{
            for(let row of rows){
                row.children[6].value = '';
            }
            intervals = null;
            alert(valid[1]);
            rows[0].children[4].focus();
        }
    }

    refresh_tf_dump(msg){
        this.entry_dump.val(msg);
    }

    on_rd_select(){
        this._clear_dynamic_dist();
        this._clear_demands();
        let _inputs = [];
        let exit_label = null;
        if(this.scene.routing_mode == STATIC_ROUTING){
            if(this.matrix_roads_option.val() != null){
                this.rd_current = this.matrix_roads_option.val();
                let road = this.scene.routable_roads()[this.rd_current];
                let route = this.scene.routes.get(this.scene.get_road_by_label(road.label));

                for(let exit of route.get_exits()){
                    let label_car = document.createElement("label");
                    label_car.id = 'label-car';
                    label_car.innerHTML = exit.label + ':';
                    label_car.setAttribute('class', 'col-sm-4');

                    let input_car = document.createElement("input");
                    input_car.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_car.id = 'car-' + exit_label;
                    _inputs.push(input_car);

                    let row_car = document.createElement("row");
                    row_car.setAttribute('class', 'row');

                    this.matrix_dist_car.append(row_car);
                    row_car.append(label_car);
                    row_car.append(input_car);

                    let label_bus = document.createElement("label");
                    label_bus.id = 'label-bus';
                    label_bus.innerHTML = exit.label + ':';
                    label_bus.setAttribute('class', 'col-sm-4');

                    let input_bus = document.createElement("input");
                    input_bus.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_bus.id = 'bus-' + exit_label;
                    _inputs.push(input_bus);

                    let row_bus = document.createElement("row");
                    row_bus.setAttribute('class', 'row');

                    this.matrix_dist_bus.append(row_bus);
                    row_bus.append(label_bus);
                    row_bus.append(input_bus);

                    let label_motorcycle = document.createElement("label");
                    label_motorcycle.id = 'label-motorcycle';
                    label_motorcycle.innerHTML = exit.label + ':';
                    label_motorcycle.setAttribute('class', 'col-sm-4');

                    let input_motorcycle = document.createElement("input");
                    input_motorcycle.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_motorcycle.id = 'motorcycle-' + exit_label;
                    _inputs.push(input_motorcycle);

                    let row_motorcycle = document.createElement("row");
                    row_motorcycle.setAttribute('class', 'row');

                    this.matrix_dist_motorcycle.append(row_motorcycle);
                    row_motorcycle.append(label_motorcycle);
                    row_motorcycle.append(input_motorcycle);

                    let label_jeep = document.createElement("label");
                    label_jeep.id = 'label-jeep';
                    label_jeep.innerHTML = exit.label + ':';
                    label_jeep.setAttribute('class', 'col-sm-4');

                    let input_jeep = document.createElement("input");
                    input_jeep.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_jeep.id = 'jeep-' + exit_label;
                    _inputs.push(input_jeep);

                    let row_jeep = document.createElement("row");
                    row_jeep.setAttribute('class', 'row');

                    this.matrix_dist_jeep.append(row_jeep);
                    row_jeep.append(label_jeep);
                    row_jeep.append(input_jeep);

                    let label_truck = document.createElement("label");
                    label_truck.id = 'label-truck';
                    label_truck.innerHTML = exit.label + ':';
                    label_truck.setAttribute('class', 'col-sm-4');

                    let input_truck = document.createElement("input");
                    input_truck.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_truck.id = 'truck-' + exit_label;
                    _inputs.push(input_truck);

                    let row_truck = document.createElement("row");
                    row_truck.setAttribute('class', 'row');

                    this.matrix_dist_truck.append(row_truck);
                    row_truck.append(label_truck);
                    row_truck.append(input_truck);

                    let label_tricycle = document.createElement("label");
                    label_tricycle.id = 'label-tricycle';
                    label_tricycle.innerHTML = exit.label + ':';
                    label_tricycle.setAttribute('class', 'col-sm-4');

                    let input_tricycle = document.createElement("input");
                    input_tricycle.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_tricycle.id = 'tricycle-' + exit_label;
                    _inputs.push(input_tricycle);

                    let row_tricycle = document.createElement("row");
                    row_tricycle.setAttribute('class', 'row');

                    this.matrix_dist_tricycle.append(row_tricycle);
                    row_tricycle.append(label_tricycle);
                    row_tricycle.append(input_tricycle);
                }

                if(route.obs_matrix){
                    for(let agent of AGENT_TYPES){
                        for(let exit of route.get_exits()){
                            exit_label = exit.label.replace(/[- )(]/g,'-');
                            let input = document.getElementById(agent + '-' + exit_label);
                            input.value = route.obs_matrix.get(agent).get(exit.label);
                        }
                    }
                }

                else{
                    for(let input of _inputs){
                        input.value = 1 / route.get_exits().length ;
                    }
                }

                // this.matrix_onset.val(config.to_m(route.get_onset()));
                this.gc.change_menu_state(TRAFFIC_DATA, STATIC_ROUTING_BUTTONS, ENABLED);
            }
        }

        else{
            if(this.matrix_roads_option.val() != null) {
                this.rd_current = this.matrix_roads_option.val();
                let road = this.scene.entry_roads()[this.rd_current];
                let entry = this.scene.dispatcher.get(road);
                let exit_roads = this.scene.get_exit_roads(road);
                explored = [];

                for(let exit of exit_roads){
                    let label_exit = document.createElement("label");
                    label_exit.innerHTML = exit.label + ':';
                    label_exit.setAttribute('class', 'col-sm-4');

                    let input_exit = document.createElement("input");
                    input_exit.setAttribute('class', 'col-sm-8');
                    exit_label = exit.label.replace(/[- )(]/g,'-');
                    input_exit.id = exit_label;
                    _inputs.push(input_exit);

                    let row_exit = document.createElement("row");
                    row_exit.setAttribute('class', 'row');

                    this.matrix_dynamic_dist.append(row_exit);
                    row_exit.append(label_exit);
                    row_exit.append(input_exit);
                }

                if(entry.dta_matrix.size > 0){
                    for(let exit of exit_roads){
                        exit_label = exit.label.replace(/[- )(]/g,'-');
                        let input = document.getElementById(exit_label);
                        input.value = entry.dta_matrix.get(exit.label);
                    }
                }
                else{
                    for(let exit of exit_roads){
                        entry.dta_matrix.set(exit.label, 1/_inputs.length);
                    }
                    for(let input of _inputs){
                        input.value = 1 / exit_roads.length;
                    }
                }

                this.gc.change_menu_state(TRAFFIC_DATA, DYNAMIC_ROUTING_BUTTONS, ENABLED);
            }

        }

    }

    on_rd_update(){
        let road = this.scene.routable_roads()[this.rd_current];
        let route = this.scene.routes.get(this.scene.get_road_by_label(road.label));

        let new_matrix = new Map();
        for(let agent of AGENT_TYPES){
            let temp = new Map();
            for(let exit of route.get_exits()){
                let exit_label = exit.label.replace(/[- )(]/g,'-');
                let input = document.getElementById(agent + '-' + exit_label);
                new_matrix.set(agent, temp.set(exit.label, parseFloat(input.value)));
            }
        }

        if(this.check_valid_demand(new_matrix)){
            route.update_matrix(new_matrix);
            alert('Road demand distribution for ' + road.label + ' has been saved!');
        }
        else{
            alert('Invalid road demand! Total demand per agent must be equal to 1.0');
        }
    }

    check_valid_demand(matrix){
        let sum = 0;
        for(let agent of matrix.keys()){
            let dist = matrix.get(agent);
            for(let road of dist.keys()){
                let d = dist.get(road);
                if(d < 0){
                    return false
                }
                sum += d;
            }

            if(Math.abs(1.0 - sum) > 0.0001){
                return false;
            }
            sum = 0;
        }
        return true;
    }

    on_rd_default(){

        let road = this.scene.routable_roads()[this.rd_current];
        let route = this.scene.routes.get(this.scene.get_road_by_label(road.label));

        for(let agent of AGENT_TYPES){
            for(let exit of route.get_exits()){
                let exit_label = exit.label.replace(/[- )(]/g,'-');
                let input = $('#' + agent + '-' + exit_label);
                input.val(1 / route.get_exits().length);
            }
        }

        route.update_matrix(null);
        alert('Road demand distribution for ' + road.label + ' has been set back to default');
    }

    rd_save_option(){
        if(this.matrix_roads_option.val()){
            let road = this.scene.routable_roads()[this.rd_current];
            let route = this.scene.routes.get(this.scene.get_road_by_label(road.label));

            if(this.matrix_onset.val() && check_float(this.matrix_onset.val())){
                let onset = parseFloat(this.matrix_onset.val());
                route.set_onset(config.to_px(onset));
                alert('Onset value saved!');
            }
            else{
                alert(ONSET_INPUT_ERROR);
                this.matrix_onset.focus();
            }
        }
    }

    refresh_rd_dump(msg){
        this.matrix_dump.val(msg);
    }

    dynamic_routing_save(){
        this.rd_current = this.matrix_roads_option.val();
        let road = this.scene.entry_roads()[this.rd_current];
        let entry = this.scene.dispatcher.get(road);
        entry.dta_matrix.clear();

        let exit_roads = this.scene.get_exit_roads(road);
        explored = [];
        for(let exit of exit_roads){
            let exit_label = exit.label.replace(/[- )(]/g,'-');
            let input = document.getElementById(exit_label);
            let input_val = input.value;
            entry.dta_matrix.set(exit.label, input_val);
        }
    }

    dynamic_routing_default(){
        this.rd_current = this.matrix_roads_option.val();
        let road = this.scene.entry_roads()[this.rd_current];
        let entry = this.scene.dispatcher.get(road);
        entry.dta_matrix.clear();

        let exit_roads = this.scene.get_exit_roads(road);
        explored = [];
        for(let exit of exit_roads){
            let exit_label = exit.label.replace(/[- )(]/g,'-');
            let input = document.getElementById(exit_label);
            input.value = 1 / exit_roads.length;
            entry.dta_matrix.set(exit.label, 1/exit_roads.length)
        }
    }

    on_dynamic_routing(){
        this._clear_demands();
        this.populate_dynamic_routing_roads_list();
        this.scene.routing_mode = DYNAMIC_ROUTING;
        this.gc.change_menu_state(TRAFFIC_DATA, STATIC_ROUTING_BUTTONS, DISABLED);
        this.gc.change_menu_state(TRAFFIC_DATA, DYNAMIC_ROUTING_BUTTONS, ENABLED);
    }

    on_static_routing(){
        this._clear_dynamic_dist();
        this.populate_static_routing_roads_list();
        this.scene.routing_mode = STATIC_ROUTING;
        this.gc.change_menu_state(TRAFFIC_DATA, STATIC_ROUTING_BUTTONS, ENABLED);
        this.gc.change_menu_state(TRAFFIC_DATA, DYNAMIC_ROUTING_BUTTONS, DISABLED);
    }

    do_(){
        this.modal.modal('hide');
    }

    _has_0_key(flow_rates){
        for(let key of flow_rates.keys()){
            if(key[0] == 0){
                return [true, null];
            }
        }

        return [false, FLOW_RATE_INTERVAL_ERROR];

    }

    _valid_times(flow_rates){
        for(let key of flow_rates.keys()){
            let ret = check_int(key[0]);
            let ret2 = check_int(key[1]);
            if(!ret || !ret2){
                return [false, FLOW_RATE_INT_TIME_ERROR];
            }
        }
        return [true, null];
    }

    _valid_flow_rates(flow_rates, lanes){
        for(let val of flow_rates.values()){
            val = val[1];
            let ret = check_float(val) && val <= (LANE_MAX_FLOW_RATE * lanes);
            if(!ret){
                return [false, FLOW_RATE_INPUT_ERROR + LANE_MAX_FLOW_RATE * lanes + '.']
            }
        }
        return [true, null]
    }

    _valid_vehicle_counts(flow_rates){
        for(let val of flow_rates.values()){
            val = val[0];
            let ret = check_float(val);
            if(!ret || val < 0){
                return [false, VEHICLE_COUNT_INPUT_ERROR]
            }
        }
        return [true, null]
    }

    valid_flow_rate(flow_rates, lanes){

        if(flow_rates.size > 0){
            let ret = this._has_0_key(flow_rates);
            if(!ret[0]){
                return ret;
            }

            ret = this._valid_times(flow_rates);
            if(!ret[0]){
                return ret;
            }

            ret = this._valid_vehicle_counts(flow_rates);
            if(!ret[0]){
                return ret;
            }

            ret = this._valid_flow_rates(flow_rates, lanes);
            if(!ret[0]){
                return ret;
            }
        }
        return [true, null];
    }
}

class AnalysisPopup{
    constructor(){
    }

    show(gc){
        this.gc = gc;

        this.modal = $('#analysis');
        this.tabs = $('#analysis-tabs');

        this.uk_container = $('#u-k-container');
        this.q_container = $('#q-container');
        this.cvcc_container = $('#cvcc-container');
        this.stoplight_container = $('#stoplight-container');
        this.delay_container = $('#delay-container');

        this.uk_container.empty();
        this.q_container.empty();
        this.cvcc_container.empty();
        this.stoplight_container.empty();
        this.delay_container.empty();

        this.uk_var = [];
        this.q_var = [];
        this.cvcc_var = [];
        this.stoplight_var = [];
        this.delay_var = [];

        this.value = new Map();

        // populate u-k tab
        for(let road of this.gc.scene.uroads){

            let item = document.createElement('div');
            item.className = 'container-fluid';

            let checkbox = document.createElement("input");
            checkbox.type = 'checkbox';
            checkbox.id = road.label;
            if(this.gc.extras.get('uk').includes(checkbox.id)){
                checkbox.checked = true;
            }
            this.uk_var.push(checkbox);

            let label = document.createElement('label');
            label.className = 'analysis-label';
            label.htmlFor = checkbox.id;
            label.append(document.createTextNode(checkbox.id));
            item.append(checkbox);
            item.append(label);

            this.uk_container.append(item);
        }

        // populate q tab
        for(let survey of this.gc.scene.surveyors){

            if(survey.road instanceof Uninterrupted_Road && survey.type_ == 'Unique'){
                let item = document.createElement('div');
                item.className = 'container-fluid';

                let checkbox = document.createElement("input");
                checkbox.type = 'checkbox';
                checkbox.id = survey.road.label + ' - ' + survey.id;
                if(survey.active){
                    checkbox.checked = true;
                }
                this.q_var.push(checkbox);

                let label = document.createElement('label');
                label.className = 'analysis-label';
                label.htmlFor = checkbox.id;
                label.append(document.createTextNode(checkbox.id));
                item.append(checkbox);
                item.append(label);

                this.q_container.append(item);
            }
        }

        // populate cvcc tab
        for(let survey of this.gc.scene.surveyors){

            if(survey.road instanceof Interrupted_Road || (survey.road instanceof Uninterrupted_Road && survey.type_ == 'Unique')){
                let item = document.createElement('div');
                item.className = 'container-fluid';

                let checkbox = document.createElement("input");
                checkbox.type = 'checkbox';
                checkbox.id = survey.road.label + ' - ' + survey.id + ' ';
                if(survey.active){
                    checkbox.checked = true;
                }
                this.cvcc_var.push(checkbox);

                let label = document.createElement('label');
                label.className = 'analysis-label';
                label.htmlFor = checkbox.id;
                label.append(document.createTextNode(checkbox.id));
                item.append(checkbox);
                item.append(label);

                this.cvcc_container.append(item);
            }
        }

        // populate stoplight tab
        let c_iter = this.gc.scene.controls.values();
        let c_list = [];
        let temp = null;

        for(let ctr=0; ctr<this.gc.scene.controls.size; ctr++){
            temp = c_iter.next().value;
            for(let t of temp){
                c_list.push(t);
            }
        }

        if(!c_list){
            c_list = [];
        }

        for(let c of c_list){
            if(c instanceof StopLight){
                let item = document.createElement('div');
                item.className = 'container-fluid';

                let checkbox = document.createElement("input");
                checkbox.type = 'checkbox';
                checkbox.id = c.road.label + ' - ' + config.to_m(c.pos) + ' - ' + c.lane;
                if(this.gc.extras.get('stoplight').includes(c)){
                    checkbox.checked = true;
                }
                this.stoplight_var.push(checkbox);

                let label = document.createElement('label');
                label.className = 'analysis-label';
                label.htmlFor = checkbox.id;
                label.append(document.createTextNode(checkbox.id));
                item.append(checkbox);
                item.append(label);
                this.stoplight_container.append(item);
            }
        }

        // populate delay tab
        for(let survey of this.gc.scene.surveyors){

            if(survey.type_ == 'Bus'){
                let item = document.createElement('div');
                item.className = 'container-fluid';

                let checkbox = document.createElement("input");
                checkbox.type = 'checkbox';
                checkbox.id = survey.road.label + ' - ' + survey.id;
                if(survey.active){
                    checkbox.checked = true;
                }
                this.delay_var.push(checkbox);

                let label = document.createElement('label');
                label.className = 'analysis-label';
                label.htmlFor = checkbox.id;
                label.append(document.createTextNode(checkbox.id));
                item.append(checkbox);
                item.append(label);

                this.delay_container.append(item);
            }
        }

        this.modal.modal();
    }

    do_(){
        this._process_uk();
        this._process_q();
        this._process_cvcc();
        this._process_stoplight();
        this._process_delay();
        this.modal.modal('hide');

        this.gc.extras = this.value;
        let zones = this.value.get('q').concat(this.value.get('cvcc'), this.value.get('delay'));
        this.gc.scene.activate_collectors(zones);
    }

    select_all(){
        let index = null;

        for(let ctr=0; ctr<this.tabs.children().length; ctr++){
            let child = this.tabs.children()[ctr];
            if(child.className == 'active'){
                index = ctr;
                break;
            }
        }

        if(index == 0){
            for(let item of this.uk_var){
                item.checked = true;
            }
        }
        else if(index == 1){
            for(let item of this.q_var){
                item.checked = true;
            }
        }
        else if(index == 2){
            for(let item of this.cvcc_var){
                item.checked = true;
            }
        }
        else if(index == 3){
            for(let item of this.stoplight_var){
                item.checked = true;
            }
        }
        else if(index == 4){
            for(let item of this.delay_var){
                item.checked = true;
            }
        }
    }

    deselect_all(){
        let index = null;

        for(let ctr=0; ctr<this.tabs.children().length; ctr++){
            let child = this.tabs.children()[ctr];
            if(child.className == 'active'){
                index = ctr;
                break;
            }
        }

        if(index == 0){
            for(let item of this.uk_var){
                item.checked = false;
            }
        }
        else if(index == 1){
            for(let item of this.q_var){
                item.checked = false;
            }
        }
        else if(index == 2){
            for(let item of this.cvcc_var){
                item.checked = false;
            }
        }
        else if(index == 3){
            for(let item of this.stoplight_var){
                item.checked = false;
            }
        }
        else if(index == 4){
            for(let item of this.delay_var){
                item.checked = false;
            }
        }
    }

    _process_uk(){
        let temp_list = [];
        for(let l of this.uk_var){
            if(l.checked){
                temp_list.push(l.id);
            }
        }
        this.value.set('uk', temp_list);
    }

    _process_q(){
        let survey_list = [];
        let temp_list = [];
        for(let survey of this.gc.scene.surveyors){
            if(survey.road instanceof Uninterrupted_Road && survey.type_ == 'Unique'){
                survey_list.push(survey);
            }
        }

        for(let ctr=0; ctr<this.q_var.length; ctr++){
            let l = this.q_var[ctr];
            if(l.checked){
                temp_list.push(survey_list[ctr]);
            }
        }
        this.value.set('q', temp_list);
    }

    _process_cvcc(){
        let survey_list = [];
        let temp_list = [];

        for(let survey of this.gc.scene.surveyors){
            if(survey.road instanceof Interrupted_Road || (survey.road instanceof Uninterrupted_Road && survey.type_ == 'Unique')){
                survey_list.push(survey);
            }
        }

        for(let ctr=0; ctr<this.cvcc_var.length; ctr++){
            let l = this.cvcc_var[ctr];
            if(l.checked){
                temp_list.push(survey_list[ctr]);
            }
        }
        this.value.set('cvcc', temp_list);
    }

    _process_stoplight(){
        let control_list = [];
        let temp_list = [];

        let c_iter = this.gc.scene.controls.values();
        let c_list = [];
        let temp = null;

        for(let ctr=0; ctr<this.gc.scene.controls.size; ctr++){
            temp = c_iter.next().value;
            for(let t of temp){
                c_list.push(t);
            }
        }

        if(!c_list){
            c_list = [];
        }

        for(let c of c_list){
            if(c instanceof StopLight){
                control_list.push(c);
            }
        }

        for(let ctr=0; ctr<this.stoplight_var.length; ctr++){
            let l = this.stoplight_var[ctr];
            if(l.checked){
                temp_list.push(control_list[ctr]);
            }
        }
        this.value.set('stoplight', temp_list);
    }

    _process_delay(){
        let survey_list = [];
        let temp_list = [];

        for(let survey of this.gc.scene.surveyors){
            if(survey.type_ == 'Bus'){
                survey_list.push(survey);
            }
        }

        for(let ctr=0; ctr<this.delay_var.length; ctr++){
            let l = this.delay_var[ctr];
            if(l.checked){
                temp_list.push(survey_list[ctr]);
            }
        }
        this.value.set('delay', temp_list);
    }
}

class ParametersPopup{
    constructor(){

    }

    show(gc, desired_velocity, minimum_headway, safe_time_headway, acceleration_threshold, politeness_factor,
         safe_braking_deceleration){
        this.gc = gc;
        this.scene = gc.scene;

        this.params_desired_velocity = $('#params-desired-velocity');
        this.params_minimum_headway = $('#params-min-gap-v0');
        this.params_safe_time_headway = $('#params-safe-time-headway');

        this.params_acceleration_threshold = $('#params-acceleration-threshold');
        this.params_politeness_factor = $('#params-politeness-factor');
        this.params_safe_braking_deceleration = $('#params-safe-breaking-deceleration');

        this.modal = $('#parameters');
        this.modal.modal();

        this.params_desired_velocity.val(desired_velocity);
        this.params_minimum_headway.val(minimum_headway);
        this.params_safe_time_headway.val(safe_time_headway);

        this.params_acceleration_threshold.val(acceleration_threshold);
        this.params_politeness_factor.val(politeness_factor);
        this.params_safe_braking_deceleration.val(safe_braking_deceleration);

    }

    do_(){
        this.modal.modal('hide');
    }

    car_following_save(){
        let desired_velocity = this.params_desired_velocity.val();
        let minimum_headway = this.params_minimum_headway.val();
        let safe_time_headway = this.params_safe_time_headway.val();

        if(this.valid_inputs([desired_velocity, minimum_headway, safe_time_headway])){

            config.desired_velocity = parseFloat(desired_velocity);
            config.minimum_headway = parseFloat(minimum_headway);
            config.safe_time_headway = parseFloat(safe_time_headway);

            alert('Car following model parameters have been saved!');
        }
        else{
            alert(NONFLOAT_ERROR);
            this.params_desired_velocity.focus();
        }
    }

    car_following_default(){
        config.desired_velocity = DESIRED_VELOCITY;
        config.minimum_headway = MINIMUM_HEADWAY;
        config.safe_time_headway = SAFE_TIME_HEADWAY;

        this.params_desired_velocity.val(config.desired_velocity);
        this.params_minimum_headway.val(config.minimum_headway);
        this.params_safe_time_headway.val(config.safe_time_headway);

        alert('Car following model parameters have been set to default!');
    }

    lane_changing_save(){
        let acceleration_threshold = this.params_acceleration_threshold.val();
        let politeness_factor = this.params_politeness_factor.val();
        let safe_braking_deceleration = this.params_safe_braking_deceleration.val();
        
        if(this.valid_inputs([acceleration_threshold, politeness_factor, safe_braking_deceleration])){

            config.acceleration_threshold = parseFloat(acceleration_threshold);
            config.politeness_factor = parseFloat(politeness_factor);
            config.safe_braking_deceleration = parseFloat(safe_braking_deceleration);

            alert('Lane changing model parameters have been saved!');
        }
        else{
            alert(NONFLOAT_ERROR);
            this.params_acceleration_threshold.focus();
        }
    }

    lane_changing_default(){
        config.acceleration_threshold = ACCELERATION_THRESHOLD;
        config.politeness_factor = POLITENESS_FACTOR;
        config.safe_braking_deceleration = SAFE_BRAKING_DECELERATION;

        this.params_acceleration_threshold.val(config.acceleration_threshold);
        this.params_politeness_factor.val(config.politeness_factor);
        this.params_safe_braking_deceleration.val(config.safe_braking_deceleration);

        alert('Lane changing model parameters have been set to default!');
    }

    valid_inputs(inputs){
        for(let input of inputs){
            if(!check_float(input)){
                return false;
            }
        }
        return true;
    }
}

class SavePopup{
    constructor(){

    }

    show(gc){
        this.gc = gc;
        this.scene = gc.scene;

        this.filename_entry = $('#save-filename');

        this.modal = $('#save');
        this.modal.modal();
    }

    do_(){
        let file_name = this.filename_entry.val();
        if(file_name && !(has_whitespace(file_name))){
            this.gc.scene.serialize(file_name + '.lmf');
            this.modal.modal('hide');
        }
        else{
            alert(FILENAME_INVALID_ERROR);
            this.filename_entry.focus();
        }
    }
}

class ImportOSMPopUp{ // to work on by Sam
    constructor(){

    }

    show(gc){
        this.gc = gc;
        this.scene = gc.scene;
        this.modal = $('#traffic-data');

        this.entry_roads_option = $('#traffic-data-entry-roads');
        this.entry_roads_option.empty();

        for(let ctr=0; ctr<this.scene.entry_roads().length; ctr++){
            let road = this.scene.entry_roads()[ctr];
            let option = document.createElement('option');
            option.value = road.label;
            option.innerHTML = road.label;
            this.entry_roads_option.append(option, road.label);
        }

        this.entry_roads_option.change(function(){
            let value = $(this).val()[0];
            $('#traffic-data-entry-save').text('Save flow rate for ' + "'" + value + "'");
        });

        this.modal.modal();
    }
}

