import docplex.mp.model as cpx
import pandas as pd
import time

from ctmmodels.const import *
from ctmmodels.base import BaseModel

class Constraint5Model(BaseModel):

    def __init__(self, *args, **kwargs):
        super(Constraint5Model, self).__init__(*args, **kwargs)
        
    def generate_decision_vars(self):
        super(Constraint5Model, self).generate_decision_vars()

        self.g_vars = {(i,t): self.model.binary_var(
            name="g_{}^{}".format(i,t))
        for i in self.set_C_I
        for t in self.set_T}

        self._g_count = len(self.g_vars)
        self._vars_count = self._g_count + self._x_count + self._y_count

    def generate_constraints(self):
        super(Constraint5Model, self).generate_constraints()

        green_flowrate = [
            (self.model.add_constraint(
                ct=(
                    self.y_vars[(i,j,t)]
                    - self.F[i]*self.g_vars[(i,t)]
                    <= 0
                ),
                ctname="green_flowrate_{},{}^{}".format(i,j,t)
            ))
            for t in self.set_T
            for i in self.set_C_I
            for j in self.S[i]
        ]

        slowstart_flowrate = [
            (self.model.add_constraint(
                ct=(
                    self.y_vars[(i,j,t+1)]
                    - self.F[i]
                    + (self.F[i]*self.flow_rate_reduction)*self.g_vars[(i,t+1)]
                    - (self.F[i]*self.flow_rate_reduction)*self.g_vars[(i,t)]
                    <= 0
                ),
                ctname="slowstart_flowrate_{},{}^{}".format(i,j,t+1)
            ))
            for t in self.set_T_bounded
            for i in self.set_C_I
            for j in self.S[i]
        ]

        self._constraints['greenflowrate'] = {
            'green_flowrate': green_flowrate,
            'slowstart_flowrate': slowstart_flowrate
        }

        self._constraints_count = self._constraints_count + len(green_flowrate) + len(slowstart_flowrate)

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

        self._constraints_count = self._constraints_count + len(green_max) + len(green_min)

        return self._constraints_count

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()

    def return_solution(self):
        df_x, df_y = super(Constraint5Model, self).return_solution()

        df_g_raw = pd.DataFrame.from_dict(self.g_vars, orient="index", 
                                          columns = ["variable_object"])

        df_g_raw.reset_index(inplace=True)
        df_g_raw["is_green"] = df_g_raw["variable_object"].apply(lambda item: item.solution_value)
        df_g_raw['cell'] = df_g_raw['index'].apply(lambda x: x[0])
        df_g_raw['timestep'] = df_g_raw['index'].apply(lambda x: x[1])

        df_g = df_g_raw[['timestep', 'cell', 'is_green']]

        return df_x, df_y, df_g


class Constraint6Model(Constraint5Model):

    def __init__(self, *args, **kwargs):
        super(Constraint6Model, self).__init__(*args, **kwargs)
        
    def generate_constraints(self):
        super(Constraint6Model, self).generate_constraints()

        movements_min = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for i in self.set_C_I)
                    >= 2
                ),
                ctname='movements_min^{}'.format(t)
            ))
            for t in self.set_T
        ]

        movements_max = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for i in self.set_C_I)
                    <= 4
                ),
                ctname='movements_max^{}'.format(t)
            ))
            for t in self.set_T
        ]

        movements_guarantee = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for t in self.set_T)
                    >= self.g_min
                ),
                ctname='movements_guarantee^{}'.format(i)
            ))
            for i in self.set_C_I
        ]

        movements_conflicting = [
            (self.model.add_constraint(
                ct=(
                    self.g_vars[(i,t)]
                    + self.g_vars[(j,t)]
                    <= 1
                ),
                ctname='movements_conflicting_{},{}^{}'.format(i,j,t)
            ))
            for t in self.set_T
            for i in self.set_C_I
            for j in self.J[i]
        ]

        self._constraints['conflicts'] = {
            'movements_min': movements_min,
            'movements_max': movements_max,
            'movements_guarantee': movements_guarantee,
            'movements_conflicting': movements_conflicting
        }

        self._constraints_count = self._constraints_count + len(movements_min) + len(movements_max) + len(movements_guarantee) + len(movements_conflicting)

        return self._constraints_count

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()