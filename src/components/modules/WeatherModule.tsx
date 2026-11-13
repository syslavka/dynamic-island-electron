import { weatherService } from "../../services/mockServices";
import { Icon } from "../Icon";

export function WeatherModule() {
  const weather = weatherService.getCurrent();
  return (
    <div className="weather-module module-enter">
      <div>
        <p className="eyebrow">{weather.city}</p>
        <h3>
          {weather.temperature}°<span>c</span>
        </h3>
        <p>{weather.condition}</p>
        <span>
          H: {weather.high}° &nbsp; L: {weather.low}°
        </span>
      </div>
      <div className="weather-sun">
        <Icon name="sun" size={72} />
      </div>
      <p className="weather-note">
        A good day to take the scenic route.
        <small>Sample forecast · No live weather connection</small>
      </p>
    </div>
  );
}
