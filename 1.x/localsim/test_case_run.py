from os import path
import sys
from localsim import simrequesthandler as API
import random
import string


model_type_map = {
    'D': (1, 0, 0),
    'T': (0, 1, 0),
    'F': (0, 0, 1),
    'DT': (0.5, 0.5, 0),
    'TF': (0, 0.5, 0.5),
    'DF': (0.5, 0, 0.5),
    'DTF': (0.33, 0.33, 0.33),
    'PM': (0,0,0)
}

def run_test_case(demand_ns, demand_ew, duration, new_model, model_type):
    # duration in MINUTES
    api = API.API()

    # edit the settings
    demand = demand_ns
    if (demand_ns != demand_ew):
        demand = (demand_ns, demand_ew)
    settings = {
        'demand': demand,
        'new_model': new_model == 'new',
        'alpha': model_type_map[model_type][0],
        'beta': model_type_map[model_type][1],
        'gamma': model_type_map[model_type][2],

        'parameters': {
            'r_left': 0.25,
            'r_through': 0.5,
            'r_right': 0.25,
            'sat_flow_rate': 1800,
            'time_range': 30,
            'time_step': 2,
            'g_min': 6,
            'g_max': 20,
            'flow_rate_reduction': 1
        }
    }

    filename = 'a{}_b{}_c{}'.format(settings['alpha'], settings['beta'], settings['gamma']) if settings['new_model'] else 'old'
    api.set_runner(settings, '_d{}_{}'.format(demand, filename))

    demand_tuple = (demand_ns, demand_ew)
    case_study_map = 'ctm_{}_{}.lmf'.format(*demand_tuple)
    api.load(path.join(path.dirname(__file__), '..', '..', 'maps', 'experiments', case_study_map))

    randstring = ''.join([random.choice(string.ascii_letters+string.digits) for n in xrange(8)])
    print("RUNNING on {}: {}\nSeed: {}\n".format(case_study_map, duration*6000, randstring))
    api.run(duration * 6000, 'static', randstring, False)

def main():
    # demand_ns, demand_ew, duration, new_model, model_type, randstring
    run_test_case(int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5])

if __name__ == "__main__":
    main()
