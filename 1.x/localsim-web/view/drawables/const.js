const CANVAS_WIDTH = '10000';
const CANVAS_HEIGHT = '10000';

const NORMAL = 'green';  // green
const FORCED = 'red';  // red
const BLINKER_COLOR = 'yellow';
const BLINKER_RADIUS = 2.0;

const AGENT_COLOR = ['#caff8a', '#00FFFF', '#FFFFFF', '#c0c0e8', '#FF7e00', '#ff99cc'];

const CAR_COLOR = '#caff8a';
const BUS_COLOR = '#00FFFF';
const JEEP_COLOR = '#FFFFFF';
const TRUCK_COLOR = '#c0c0e8';
const MOTORCYCLE_COLOR = '#FF7e00';
const TRICYCLE_COLOR = '#ff99cc';

const NODE_RADIUS = 3;
const NODE_SRC_FILL = 'green';
const NODE_DST_FILL = 'red';
const SPLIT_FILL = 'purple';
const NODE_OUTLINE = 'black';
const SPLIT_OUTLINE = 'blue';
const TRACE_STROKE = 'black';
const UROAD_FILL = '#6b6b6b';
const IROAD_FILL = '#999797';
const LANE_MARKING_STROKE = 'white';

const SELECTION_RADIUS = 3;

const CONTROL_WIDTH = 2.0;
const STOP_FILL = 'red';
const YIELD_FILL = 'yellow';
const STOP_LIGHT_FILL = ['red', 'green', 'yellow'];
const MAJOR_CONFLICT = 'green';
const MINOR_CONFLICT = 'red';
const SPEED_LIMIT_FILL = 'yellow';
const PTSTOP_FILL = 'green';
const TYPE_RESTRICTION_FILL = 'red';

const ROAD_SHORT_ERROR = 'Road too short! Minimum link length is 25.0 meters.';
const NONNUMERIC_ERROR = 'Enter a numeric value greater than 0.';
const RANGE_ERROR = 'Input out of range!';
const NONINT_ERROR = 'Enter a valid integer value.';
const NONFLOAT_ERROR = 'Enter a valid float value.';
const MISSING_FILE_ERROR = 'Enter a filename.';
const DATA_INTEGRITY_ERROR = 'The osm contains traffic data that is inconsistent with the road network.';
const ONSET_INPUT_ERROR = 'Invalid onset value.';
const OFFSET_INPUT_ERROR = 'Invalid offset value.';
const STOP_INPUT_ERROR = 'Invalid emergency stop value.';
const VEHICLE_INPUT_ERROR = 'No vehicle type selected';
const NAME_INPUT_ERROR = 'Missing input on label';
const LANE_INPUT_ERROR = 'Missing input on lanes';
const LANE_INPUT_INT_ERROR = 'Invalid lanes input';
const RWIDTH_INPUT_ERROR = 'Missing input on lane width';
const WiDTH_INPUT_FLOAT_ERROR = 'Invalid lane width input';
const LIMIT_INPUT_ERROR = 'Missing input on speed limit';
const LIMIT_INPUT_FLOAT_ERROR = 'Invalid input on speed limit';
const Z_INPUT_ERROR = 'Missing input on gradient';
const Z_IMPROPER_ERROR = 'Input proper values on gradient';
const LANE_IMPROPER_ERROR = 'Input proper values on lanes';
const RWIDTH_IMPROPER_ERROR = 'Input proper values on lane width';
const LIMIT_IMPROPER_ERROR = 'Enter proper values on speed limit';
const NAME_EXISTS_ERROR = 'Road name already exists!';
const NAME_SPACE_ERROR = 'Road name should not have spaces';
const LANE_SELECTED_ERROR = 'No lane selected!';
const LANE_MISMATCH_ERROR = 'Invalid lane selection!';
const SPLITS_INPUT_ERROR = 'Number of splits must be an integer from 0 to 20';
const INPUT_MISSING_ERROR = 'No Input Selected!';
const LANDMARK_INPUT_ERROR = 'Enter a label for the landmark';
const BIAS_INPUT_ERROR = 'Bias value must be between 0.0 and 1.0';
const FLOW_RATE_INPUT_ERROR = 'Flow rate must be an integer from 1 to ';
const VEHICLE_COUNT_INPUT_ERROR = 'Invalid vehicle count input.';
const SIMULATION_TIME_ERROR = 'Simulation time must be an integer from 1 to 30000.';
const RUNS_ERROR = 'Number of runs must be an integer greater than 0';
const DIST_ERROR = 'Invalid distribution! Total must be equal to 1.0';
const MATCH_CONFLICT_ERROR = 'Select conflict zones.';
const FILE_READER_API_ERROR = 'FileReader API is not supported by your browser.';
const FLOW_RATE_INTERVAL_ERROR = 'Invalid distribution!\n\nThere should be flow rate data for time = 0.';
const FLOW_RATE_INT_TIME_ERROR = 'Time must be an integer.';
const INTERVAL_INT_TIME_ERROR = 'Interval must be an integer greater than 0.';
const CLEAR_CONFLICT_GROUP_ERROR = 'Select conflict zones.';
const SCALING_ERROR = 'Scale factor too large and will cause rendering problems. Action aborted.\n\nEnter a smaller scale.';
const UROAD_LENGTHS_ERROR = 'Unable to proceed with simulation!\n\nA link has length < 25.0m:\n';
const FILENAME_INVALID_ERROR = 'Invalid file name. File name should not have spaces';
const INVALID_LMF = 'Invalid map file. Please use .lmf file extension';
const INVALID_GUIDE = 'Invalid guide file. Please use .png or .jpg file extension';
const INVALID_STOP_YIELD_INPUT = 'Invalid input. Choose between stop sign and yield sign';

const MATCH_CONFLICT_SUCCESS = 'Conflict zones have been matched successfully.';
const FLOW_RATE_SUCCESS = 'Flow rate saved!';
const CLEAR_CONFLICT_GROUP_SUCCESS = 'Conflict groups have been cleared.';

const ESC_KEY = 27;
const ENTER_KEY = 13;
const P_KEY = 80;
const L_KEY = 76;
const S_KEY = 83;
const N_KEY = 78;
const U_KEY = 85;
const G_KEY = 71;
const T_KEY = 84;
const ONE_KEY = 49;
const TWO_KEY = 50;
const THREE_KEY = 51;

const DISABLED = true;
const ENABLED = false;
const TOOLBAR = 'toolbar';
const NAVBAR = 'navbar';
const NAVBAR_PAUSE_STOP = 'navbar_p_s';
const NAVBAR_PLAY = 'navbar_play';
const TRAFFIC_DATA = 'traffic_data';

const TOOLBAR_BUTTONS = ['uroad-btn', 'iroad-btn', 'conflict-btn', 'stop-btn', 'limit-btn', 'stoplight-btn',
    'ptstop-btn', 'restrict-btn', 'survey-btn', 'landmark-btn', 'scale-btn'];

const PLAY = ['#play-container'];
const PAUSE_STOP = ['#pause-container', '#stop-container'];
const NAV_DISABLE_ON_PLAY = ['#play-container', '#traffic-data-container', '#file-container', '#undo-container', '#file-menu'];

const TRAFFIC_DATA_OPTIONS = ['traffic-data-entry-add', 'traffic-data-entry-delete', 'traffic-data-entry-save', 'traffic-data-entry-update', 'traffic-data-entry-default'];
const STATIC_ROUTING_BUTTONS = ['traffic-data-matrix-static-dist-update', 'traffic-data-matrix-static-dist-default'];
const DYNAMIC_ROUTING_BUTTONS = ['traffic-data-matrix-dynamic-dist-update', 'traffic-data-matrix-dynamic-dist-default'];

const AGENT_TYPES = ['car', 'bus', 'motorcycle', 'jeep', 'truck', 'tricycle'];

const NUMBER_OF_SPLITS = 10;

const DEFAULT_MEAN = 3.355436;  // Average of all mean from Engr. Rentoy's paper
const DEFAULT_STD_DEV = 0.712566;  //Average of all std deviation from Engr. Rentoy's paper

