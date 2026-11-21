// 後台模組設定：新增一個模組只要在這裡加一段，不需要新路由或新模板
const wx = ['晴','多雲','陰','陰短暫雨','短暫陣雨','午後雷陣雨','雨','大雨','豪雨','霧','多雲時晴'];
module.exports = {
  locations: {
    label: '縣市地點', table: 'locations', order: ['sort', true],
    fields: [
      { name: 'name', label: '名稱', type: 'text', required: true },
      { name: 'region', label: '區域', type: 'select', options: ['北部','中部','南部','東部','離島'] },
      { name: 'lat', label: '緯度', type: 'number', step: 'any' },
      { name: 'lon', label: '經度', type: 'number', step: 'any' },
      { name: 'sort', label: '排序', type: 'number' }
    ],
    list: ['name', 'region', 'sort']
  },
  forecasts: {
    label: '天氣預報', table: 'forecasts', order: ['forecast_date', false],
    fields: [
      { name: 'location_id', label: '地點', type: 'select', ref: 'locations', required: true },
      { name: 'forecast_date', label: '日期', type: 'date', required: true },
      { name: 'wx', label: '天氣現象', type: 'select', options: wx, required: true },
      { name: 'temp_high', label: '最高溫(°C)', type: 'number', step: 'any' },
      { name: 'temp_low', label: '最低溫(°C)', type: 'number', step: 'any' },
      { name: 'pop', label: '降雨機率(%)', type: 'number' },
      { name: 'comfort', label: '舒適度', type: 'select', options: ['寒冷','稍有寒意','舒適','悶熱','易中暑'] },
      { name: 'wind', label: '風向風速', type: 'text' },
      { name: 'uvi', label: '紫外線指數', type: 'number' }
    ],
    list: ['location_id', 'forecast_date', 'wx', 'temp_high', 'temp_low', 'pop'], join: 'locations(name)'
  },
  observations: {
    label: '即時觀測', table: 'observations', order: ['obs_time', false],
    fields: [
      { name: 'location_id', label: '測站(地點)', type: 'select', ref: 'locations', required: true },
      { name: 'obs_time', label: '觀測時間', type: 'datetime', required: true },
      { name: 'temp', label: '氣溫(°C)', type: 'number', step: 'any' },
      { name: 'humidity', label: '相對溼度(%)', type: 'number' },
      { name: 'pressure', label: '氣壓(hPa)', type: 'number', step: 'any' },
      { name: 'wind_speed', label: '風速(m/s)', type: 'number', step: 'any' },
      { name: 'wind_dir', label: '風向(度)', type: 'number' },
      { name: 'rain_1h', label: '時雨量(mm)', type: 'number', step: 'any' },
      { name: 'visibility', label: '能見度(km)', type: 'number', step: 'any' }
    ],
    list: ['location_id', 'obs_time', 'temp', 'humidity', 'wind_speed', 'rain_1h'], join: 'locations(name)'
  },
  warnings: {
    label: '天氣警特報', table: 'warnings', order: ['issued_at', false],
    fields: [
      { name: 'title', label: '標題', type: 'text', required: true },
      { name: 'type', label: '類型', type: 'select', options: ['豪雨特報','大雨特報','陸上強風','低溫特報','高溫資訊','濃霧','海上警報','雷雨即時訊息'], required: true },
      { name: 'level', label: '等級', type: 'select', options: ['注意','警戒','嚴重'], required: true },
      { name: 'areas', label: '影響地區', type: 'text' },
      { name: 'content', label: '內容', type: 'textarea' },
      { name: 'issued_at', label: '發布時間', type: 'datetime', required: true },
      { name: 'expires_at', label: '解除時間', type: 'datetime' },
      { name: 'active', label: '生效中', type: 'checkbox' }
    ],
    list: ['title', 'level', 'issued_at', 'active']
  },
  earthquakes: {
    label: '地震報告', table: 'earthquakes', order: ['occurred_at', false],
    fields: [
      { name: 'occurred_at', label: '發震時間', type: 'datetime', required: true },
      { name: 'magnitude', label: '規模', type: 'number', step: '0.1', required: true },
      { name: 'depth', label: '深度(km)', type: 'number', step: 'any' },
      { name: 'epicenter', label: '震央', type: 'text', required: true },
      { name: 'max_intensity', label: '最大震度', type: 'select', options: ['1級','2級','3級','4級','5弱','5強','6弱','6強','7級'] },
      { name: 'note', label: '備註', type: 'textarea' }
    ],
    list: ['occurred_at', 'magnitude', 'depth', 'epicenter', 'max_intensity']
  },
  typhoons: {
    label: '颱風消息', table: 'typhoons', order: ['updated_at', false],
    fields: [
      { name: 'name', label: '颱風名稱', type: 'text', required: true },
      { name: 'intl_no', label: '國際編號', type: 'text' },
      { name: 'status', label: '狀態', type: 'select', options: ['熱帶性低氣壓','輕度颱風','中度颱風','強烈颱風','已消散'] },
      { name: 'lat', label: '中心緯度', type: 'number', step: 'any' },
      { name: 'lon', label: '中心經度', type: 'number', step: 'any' },
      { name: 'pressure', label: '中心氣壓(hPa)', type: 'number' },
      { name: 'max_wind', label: '最大風速(m/s)', type: 'number' },
      { name: 'gust', label: '瞬間陣風(m/s)', type: 'number' },
      { name: 'speed', label: '移速(km/h)', type: 'number' },
      { name: 'heading', label: '移動方向', type: 'text' },
      { name: 'updated_at', label: '更新時間', type: 'datetime', required: true },
      { name: 'active', label: '顯示於前台', type: 'checkbox' }
    ],
    list: ['name', 'status', 'pressure', 'max_wind', 'updated_at', 'active']
  },
  ocean: {
    label: '海象資訊', table: 'ocean', order: ['obs_time', false],
    fields: [
      { name: 'station', label: '海域/測站', type: 'text', required: true },
      { name: 'obs_time', label: '時間', type: 'datetime', required: true },
      { name: 'wave_height', label: '浪高(m)', type: 'number', step: 'any' },
      { name: 'wave_period', label: '週期(s)', type: 'number', step: 'any' },
      { name: 'sea_temp', label: '海溫(°C)', type: 'number', step: 'any' },
      { name: 'tide', label: '潮汐', type: 'select', options: ['漲潮','滿潮','退潮','乾潮'] },
      { name: 'forecast', label: '海面狀況', type: 'text' }
    ],
    list: ['station', 'obs_time', 'wave_height', 'sea_temp', 'tide']
  },
  news: {
    label: '最新消息', table: 'news', order: ['published_at', false],
    fields: [
      { name: 'title', label: '標題', type: 'text', required: true },
      { name: 'category', label: '分類', type: 'select', options: ['氣象新聞','科普知識','公告','氣候資訊'] },
      { name: 'content', label: '內容', type: 'textarea' },
      { name: 'published_at', label: '發布時間', type: 'datetime', required: true },
      { name: 'published', label: '公開', type: 'checkbox' }
    ],
    list: ['title', 'category', 'published_at', 'published']
  }
};
