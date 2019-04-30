import docplex.mp.model as cpx
import pandas as pd
import time
from ctmmodels.const import *

class ParentModel(object):
    # sat_flow_rate       = 0.5 # vehicles / second
    # flow_rate_reduction = 0.5 # Not specified in the paper
    # g_min               = 6 # seconds (change to 30 seconds)
    # g_max               = 20 # seconds (change to 120 seconds)
    # time_step           = 2 # seconds / time step; NOT FROM PAPER
    # time_range          = 30 # run for this many timesteps
    # demand              = 600 # saturation
    # flow_weight         = 0.2 # NOTE: No longer needed
    # alpha               = 1
    # model_name          = 'Thesis MILP Model'

    cell_length         = FREE_FLOW_SPEED # requirement to meaasure delay accurately in CTM

    '''
    NOTE: The original paper used a saturation flow rate of 1 vehicle per time step per cell. This gives us a saturated inflow of 1 veh / 4 lanes / 2 sec = 0.125 veh per second, or 450 veh per hr per lane, which the paper labels as undersaturated. The paper gave no threshold for saturated flow, hence the usage of 1 as the saturated flow rate per timestep.
    '''

    def __init__(self,
                demand              = 600,  # veh / hr / lane
                sat_flow_rate       = 1800,  # veh / hr / lane
                flow_rate_reduction = 0.5,
                g_min               = 6,    # sec
                g_max               = 20,   # sec
                time_step           = 2,    # sec / timestep
                time_range          = 30,   # timesteps (for ease of gauging the program's size)
                r_left              = 1.0/3.0,
                r_through           = 1.0/3.0,
                r_right             = 1.0/3.0,
                preload             = None,
                model_name          = 'Thesis Parent Model'):

        self.model_name = model_name
        self.model = cpx.Model(name=self.model_name)

        # Convert all units from seconds to timesteps
        self.time_step = time_step
        self.time_range = time_range

        if (isinstance(demand, int)):
            demand = list([demand]*4)
        elif (isinstance(demand, tuple)):
            if (len(demand) == 2):
                demand = list(demand) + list(demand)
            else:
                demand = list(demand)

        self.sat_flow_rate = (float) (sat_flow_rate * time_step) / (3600)       # veh / timesteps / lane
        self.demand = [(float) (x * time_step) / (3600) for x in demand]        # veh / timesteps / lane
        self.g_min = g_min / time_step                                          # timesteps
        self.g_max = g_max / time_step                                          # timesteps
        self.cell_length = self.cell_length * time_step                         # ft (scaled)

        self.turn_ratios = [r_left, r_through, r_right]
        self.flow_rate_reduction = flow_rate_reduction
        self.preload = preload

    def generate_sets(self):
        self.set_T = range(self.time_range)
        self.set_T_bounded = range(self.time_range-1)

        # Source cells: (0,approach_id)
        self.set_C_O = [(CELL_SOURCE,0,i)
            for i in range(APPROACHES)]

        # Sink cells: (0,approach_id)
        self.set_C_S = [(CELL_SINK,0,i)
            for i in range(APPROACHES)]

        # Movement cells: (movement_id, apporach_id)
        self.set_C_I = [(CELL_MOVEMENT,i,j)
            for i in range(MOVEMENT_CELLS)
            for j in range(APPROACHES)]

        # Specific Movement cells
        self.set_C_R = [c for c in self.set_C_I if c[1] == RIGHT_TURN]
        self.set_C_T = [c for c in self.set_C_I if c[1] == THROUGH_TURN]
        self.set_C_L = [c for c in self.set_C_I if c[1] == LEFT_TURN]

        # Normal cells: (cell_id, approach_id)
        self.set_C_N = [(CELL_NORMAL,i,j)
            for i in range(APPROACH_CELLS)
            for j in range(APPROACHES)]

        # Set of all cells: (cell_type, x, y)
        self.set_C = self.set_C_O + self.set_C_S + self.set_C_I + self.set_C_N
        self.set_C_labels = [
            'source',
            'sink',
            'movement',
            'normal'
        ]

        # Define sets CF_LT, CC_LR, CC_RT once I know what they fucking are

        self.set_CF_LT = [
            ((2, LEFT_TURN, i), (2, THROUGH_TURN, j))
            for i in range(APPROACHES)
            for j in range(APPROACHES) if j != i
        ]

        self.set_CC_LR = [
            ((2, LEFT_TURN, i), (2, RIGHT_TURN, j))
            for i in range(APPROACHES)
            for j in range(APPROACHES) if (i - j == 2 or j - i == 2)
        ]

        self.set_CC_RT = [
            ((2, RIGHT_TURN, i), (2, THROUGH_TURN, j))
            for i in range(APPROACHES)
            for j in range(APPROACHES) if (j == (i+1)%APPROACHES)
        ]

        self.P = {i: P_mapping(i)
            for i in self.set_C}

        self.S = {i: S_mapping(i)
            for i in self.set_C}

        # self.J = {i: J_mapping(i)
        #     for i in self.set_C_I}

        # Rings

        self.set_H1 = [
            (2, LEFT_TURN, WESTBOUND), (2, RIGHT_TURN, NORTHBOUND),
            (2, THROUGH_TURN, EASTBOUND), (2, RIGHT_TURN, EASTBOUND),
            (2, LEFT_TURN, SOUTHBOUND), (2, RIGHT_TURN, WESTBOUND),
            (2, THROUGH_TURN, SOUTHBOUND), (2, RIGHT_TURN, SOUTHBOUND),
        ]

        self.set_H2 = [
            (2, LEFT_TURN, EASTBOUND), (2, RIGHT_TURN, SOUTHBOUND),
            (2, THROUGH_TURN, WESTBOUND), (2, RIGHT_TURN, WESTBOUND),
            (2, LEFT_TURN, NORTHBOUND), (2, RIGHT_TURN, EASTBOUND),
            (2, THROUGH_TURN, NORTHBOUND), (2, RIGHT_TURN, NORTHBOUND),
        ]

    def generate_parameters(self):
        def M_mapping(i):
            if i in self.set_C_I:
                return (self.cell_length / MEAN_CAR_LENGTH) * TURN_LANES[i[1]]
            elif i in self.set_C_O:
                return float("inf")
            return (self.cell_length / MEAN_CAR_LENGTH) * APPROACH_LANES

        def F_mapping(i):
            if i in self.set_C_I:
                return self.sat_flow_rate * TURN_LANES[i[1]]
            return self.sat_flow_rate * APPROACH_LANES

        self.d = {(i,t): self.demand[i[2]] * APPROACH_LANES
            for i in self.set_C_O
            for t in self.set_T}

        self.M = {i: M_mapping(i)
            for i in self.set_C}

        self.F = {i: F_mapping(i)
            for i in self.set_C}

        self.r = {i: self.turn_ratios[i[1]]
            for i in self.set_C_I}

    def reset_model(self):
        self.model = cpx.Model(name=self.model_name)

    def generate_decision_vars(self):
        # We won't generate g variables yet

        self.x_vars = {(i,t): self.model.continuous_var(
            lb=0,
            ub=self.M[i],
            name="x_{}^{}".format(i,t))
        for i in self.set_C
        for t in self.set_T}

        self.y_vars = {(i,j,t): self.model.continuous_var(
            lb=0,
            ub=min(self.F[i],self.F[j]),
            name="y_{}_{}^{}".format(i,j,t))
        for i in self.set_C
        for j in self.S[i]
        for t in self.set_T}

        self.g_vars = {(i,t): self.model.binary_var(
            name="g_{}^{}".format(i,t))
        for i in self.set_C_I
        for t in self.set_T}

        self.f_vars = {(i,t): self.model.continuous_var(
            lb=0,
            name="f_{}^{}".format(i,t))
        for i in self.set_C_I
        for t in self.set_T}

        self.r_vars = {(r,t): self.model.binary_var(
            name="r{}^{}".format(r,t))
        for r in [1,2]
        for t in self.set_T}

        self._g_count = len(self.g_vars)
        self._x_count = len(self.x_vars)
        self._y_count = len(self.y_vars)
        self._f_count = len(self.f_vars)
        self._r_count = len(self.r_vars)
        self._vars_count = self._g_count + self._x_count + self._y_count + self._f_count + self._r_count

    def generate_constraints(self):
        # 0. Initialize values of x
        init_src = [
            (self.model.add_constraint(
                ct=(
                    self.x_vars[(i,0)]
                    == self.d[(i,0)]
                ),
                ctname="init_src_{}".format(i)
            ))
            for i in self.set_C_O
        ]

        init_rest = [
            (self.model.add_constraint(
                ct=(
                    self.x_vars[(i,0)]
                    == (0 if self.preload is None else int(self.preload[i]))
                ),
                ctname="init_rest_{}".format(i)
            ))
            for i in self.set_C if i not in self.set_C_O
        ]

        constraint_init = {
            'src': init_src
        }

        # 1. Note: Kronecker delta was removed; might be added back if we don't get the results we want
        flowcon_1 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(k,i,t)] for k in self.P[i])
                    - self.model.sum(self.y_vars[(i,j,t)] for j in self.S[i])
                    - self.x_vars[(i,t+1)]
                    + self.x_vars[(i,t)]
                    == 0
                ),
                ctname="flowcon_normal_{}^{}".format(i,t)
            ))
            for t in self.set_T_bounded
            for i in self.set_C_N + self.set_C_I
        ]

        flowcon_2 = [
            (self.model.add_constraint(
                ct=(
                    self.d[(i,t)]
                    - self.model.sum(self.y_vars[(i,j,t)] for j in self.S[i])
                    - self.x_vars[(i,t+1)]
                    + self.x_vars[(i,t)]
                    == 0
                ),
                ctname="flowcon_source_{}^{}".format(i,t)
            ))
            for t in self.set_T_bounded
            for i in self.set_C_O
        ]

        flowcon_3 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(k,i,t)] for k in self.P[i])
                    - self.x_vars[(i,t+1)]
                    == 0
                ),
                ctname="flowcon_sink_{}^{}".format(i,t)
            ))
            for t in self.set_T_bounded
            for i in self.set_C_S
        ]

        constraint_flowcon = {
            'source': flowcon_2,
            'sink': flowcon_3,
            'rest': flowcon_1
        }

        # 2. Flow rates
        flowrate_1 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(i,j,t)] for j in self.S[i])
                    - self.x_vars[(i,t)]
                    <= 0
                ),
                ctname="flowrate_srccap_{}^{}".format(i,t)
            ))
            for t in self.set_T
            for i in self.set_C if i not in self.set_C_S
        ]

        flowrate_2 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(i,j,t)] for i in self.P[j])
                    - self.M[j]
                    + self.x_vars[(j,t)]
                    <= 0
                ),
                ctname="flowrate_destcap_{}^{}".format(j,t)
            ))
            for t in self.set_T
            for j in self.set_C if j not in self.set_C_O
        ]

        flowrate_3 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(i,j,t)] for j in self.S[i])
                    - self.F[i]
                    <= 0
                ),
                ctname="flowrate_succcap_{}^{}".format(i,t)
            ))
            for t in self.set_T
            for i in self.set_C if i not in self.set_C_S
        ]

        flowrate_4 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(i,j,t)] for i in self.P[j])
                    - self.F[j]
                    <= 0
                ),
                ctname="flowrate_predcap_{}^{}".format(j,t)
            ))
            for t in self.set_T
            for j in self.set_C if j not in self.set_C_O
        ]

        constraint_flowrate = {
            'source_cap': flowrate_1,
            'sink_cap': flowrate_2,
            'succ_cap': flowrate_3,
            'pred_cap': flowrate_4,
        }

        # 3. Turn ratios
        turnratios = [
            (self.model.add_constraint(
                ct=(
                    self.y_vars[(i,j,t)]
                    - self.model.sum(self.r[j] * self.y_vars[(i,k,t)] for k in self.S[i])
                    <= 0
                ),
                ctname="turnratios_{},{}^{}".format(i,j,t)
            ))
            for t in self.set_T
            for j in self.set_C_I
            for i in self.P[j]
        ]

        constraint_turnratios = {
            'turn_ratios': turnratios
        }

        ###
        self._constraints = {
            'init': constraint_init,
            'flowcon': constraint_flowcon,
            'flowrate': constraint_flowrate,
            'turnratios': constraint_turnratios,
        }
        ###

        # 4. FLow rates for intersection cells
        movement_flow_1 = [
            (self.model.add_constraint(
                ct=(
                    self.f_vars[(i,t)]
                    - self.F[i]*self.g_vars[(i,t)]
                    == 0
                ),
                ctname="movement_flow_1_{}^{}".format(i,t)
            ))
            for t in self.set_T
            for i in self.set_C_T + self.set_C_L
        ]

        movement_flow_2 = [
            (self.model.add_constraint(
                ct=(
                    self.f_vars[(i,t)]
                    - self.F[i]*self.g_vars[(i,t)]
                    - self.F[i]*self.g_vars[(j,t)]
                    == 0
                ),
                ctname="movement_flow_2_{},{}^{}".format(i,j,t)
            ))
            for t in self.set_T
            for (j,i) in self.set_CC_LR
        ]

        green_flowrate = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(i,j,t)] for j in self.S[i])
                    - self.f_vars[(i,t)]
                    <= 0
                ),
                ctname="green_flowrate_{}^{}".format(i,t)
            ))
            for t in self.set_T
            for i in self.set_C_I
        ]

        slowstart_flowrate = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.y_vars[(i,j,t+1)] for j in self.S[i])
                    - self.F[i]
                    + (self.F[i]*self.flow_rate_reduction)*self.g_vars[(i,t+1)]
                    - (self.F[i]*self.flow_rate_reduction)*self.g_vars[(i,t)]
                    <= 0
                ),
                ctname="slowstart_flowrate_{},{}^{}".format(i,j,t+1)
            ))
            for t in self.set_T_bounded
            for i in self.set_C_I
        ]

        self._constraints['greenflowrate'] = {
            'movement_flow_1': movement_flow_1,
            'movement_flow_2': movement_flow_2,
            'green_flowrate': green_flowrate,
            'slowstart_flowrate': slowstart_flowrate
        }

        # 5. Ring Barrier

        ring_constraint = [
            (self.model.add_constraint(
                ct=(
                    self.r_vars[(1,t)]
                    + self.r_vars[(2,t)]
                    == 1
                ),
                ctname="ring_constraint^{}".format(t)
            ))
            for t in self.set_T
        ]

        first_ring = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for i in self.set_C_T if i in self.set_H1)
                    + self.model.sum(self.g_vars[(j,t)] for j in self.set_C_L if j in self.set_H1)
                    - 2*self.r_vars[(1,t)]
                    == 0
                ),
                ctname="ring1^{}".format(t)
            ))
            for t in self.set_T
        ]

        second_ring = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for i in self.set_C_T if i in self.set_H2)
                    + self.model.sum(self.g_vars[(j,t)] for j in self.set_C_L if j in self.set_H2)
                    - 2*self.r_vars[(2,t)]
                    == 0
                ),
                ctname="ring2^{}".format(t)
            ))
            for t in self.set_T
        ]

        conflicting_movements = [
            (self.model.add_constraint(
                ct=(
                    self.g_vars[(i,t)]
                    + self.g_vars[(j,t)]
                    <= 1
                ),
                ctname="conflict_{},{}^{}".format(i,j,t)
            ))
            for (i,j) in self.set_CF_LT
            for t in self.set_T
        ]

        right_thru_movements = [
            (self.model.add_constraint(
                ct=(
                    self.g_vars[(i,t)]
                    - self.g_vars[(j,t)]
                    == 0
                ),
                ctname="right_thru_{},{}^{}".format(i,j,t)
            ))
            for (i,j) in self.set_CC_RT
            for t in self.set_T
        ]

        self._constraints['ringbarrier'] = {
            'ring_constraint': ring_constraint,
            'first_ring': first_ring,
            'second_ring': second_ring,
            'conflicting_movements': conflicting_movements,
            'right_thru_movements': right_thru_movements
        }

        # 6. Green Time limits

        green_max = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,z)] for z in range(t,t+self.g_max+2))
                    - self.g_max
                    <= 0
                ),
                ctname='green_max_{}^{}'.format(i,t)
            ))
            for t in range(self.time_range - self.g_max - 1)
            for i in self.set_C_I
        ]

        green_min = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,z)] for z in range(t+1,t+self.g_min+1))
                    - self.g_min*self.g_vars[(i,t+1)]
                    + self.g_min*self.g_vars[(i,t)]
                    >= 0
                ),
                ctname='green_min_{}^{}'.format(i,t)
            ))
            for t in range(self.time_range - self.g_min)
            for i in self.set_C_I
        ]

        self._constraints['greentime'] = {
            'green_max': green_max,
            'green_min': green_min
        }

        self._constraints_count = 0

        for _, constraint_dict in self._constraints.iteritems():
            for _, constraint_array in constraint_dict.iteritems():
                self._constraints_count = self._constraints_count + len(constraint_array)
        
        return self._constraints_count

    def generate_objective_fxn(self):
        self._objective = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)]
                for i in self.set_C_S)
            for t in self.set_T)

        self.model.maximize(self._objective)
    
    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()

    def solve(self, log_output=False):
        start = time.time()
        print("Solving...")
        self.model.solve(log_output=log_output)
        print("Done!")
        end = time.time()
        self._time = end - start
        print("Time elapsed: {}".format(self._time))
        return self._time

    def return_solution(self):
        df_x_raw = pd.DataFrame.from_dict(self.x_vars, orient="index", 
                                          columns = ["variable_object"])

        df_x_raw.reset_index(inplace=True)
        df_x_raw["volume"] = df_x_raw["variable_object"].apply(lambda item: item.solution_value)
        df_x_raw['cell'] = df_x_raw['index'].apply(lambda x: x[0])
        df_x_raw['timestep'] = df_x_raw['index'].apply(lambda x: x[1])

        df_x = df_x_raw[['timestep', 'cell', 'volume']]

        df_y_raw = pd.DataFrame.from_dict(self.y_vars, orient="index", 
                                          columns = ["variable_object"])

        df_y_raw.reset_index(inplace=True)
        df_y_raw["flow"] = df_y_raw["variable_object"].apply(lambda item: item.solution_value)
        df_y_raw['cell_from'] = df_y_raw['index'].apply(lambda x: x[0])
        df_y_raw['cell_to'] = df_y_raw['index'].apply(lambda x: x[1])
        df_y_raw['timestep'] = df_y_raw['index'].apply(lambda x: x[2])

        df_y = df_y_raw[['timestep', 'cell_from', 'cell_to', 'flow']]

        df_g_raw = pd.DataFrame.from_dict(self.g_vars, orient="index", 
                                          columns = ["variable_object"])

        df_g_raw.reset_index(inplace=True)
        df_g_raw["is_green"] = df_g_raw["variable_object"].apply(lambda item: item.solution_value)
        df_g_raw['cell'] = df_g_raw['index'].apply(lambda x: x[0])
        df_g_raw['timestep'] = df_g_raw['index'].apply(lambda x: x[1])

        df_g = df_g_raw[['timestep', 'cell', 'is_green']]

        return df_x, df_y, df_g

    def return_parameters(self):
        df_M = pd.DataFrame.from_dict(self.M, orient="index", columns=["capacity"])
        df_F = pd.DataFrame.from_dict(self.F, orient="index", columns=["max_flow"])

        return pd.concat([df_M, df_F], axis=1)

    def return_objective_value(self):
        return self.model.objective_value
