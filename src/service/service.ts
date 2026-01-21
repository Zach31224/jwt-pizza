import httpPizzaService from './httpPizzaService';
import { PizzaService } from './pizzaService';

let pizzaService: PizzaService = httpPizzaService;
export { pizzaService };
