(function (Q) {
  'use strict';

  const regions = {
    europe: 'Europa',
    asia: 'Azja',
    africa: 'Afryka',
    namerica: 'Ameryka Północna',
    samerica: 'Ameryka Południowa',
    oceania: 'Oceania',
  };

  // [kod ISO 3166-1 alpha-2, nazwa, stolica]
  const raw = {
    europe: [
      ['al', 'Albania', 'Tirana'], ['ad', 'Andora', 'Andora'], ['at', 'Austria', 'Wiedeń'],
      ['by', 'Białoruś', 'Mińsk'], ['be', 'Belgia', 'Bruksela'], ['ba', 'Bośnia i Hercegowina', 'Sarajewo'],
      ['bg', 'Bułgaria', 'Sofia'], ['hr', 'Chorwacja', 'Zagrzeb'], ['cy', 'Cypr', 'Nikozja'],
      ['me', 'Czarnogóra', 'Podgorica'], ['cz', 'Czechy', 'Praga'], ['dk', 'Dania', 'Kopenhaga'],
      ['ee', 'Estonia', 'Tallinn'], ['fi', 'Finlandia', 'Helsinki'], ['fr', 'Francja', 'Paryż'],
      ['gr', 'Grecja', 'Ateny'], ['es', 'Hiszpania', 'Madryt'], ['nl', 'Holandia', 'Amsterdam'],
      ['ie', 'Irlandia', 'Dublin'], ['is', 'Islandia', 'Reykjavík'], ['xk', 'Kosowo', 'Prisztina'],
      ['li', 'Liechtenstein', 'Vaduz'], ['lt', 'Litwa', 'Wilno'], ['lu', 'Luksemburg', 'Luksemburg'],
      ['lv', 'Łotwa', 'Ryga'], ['mk', 'Macedonia Północna', 'Skopje'], ['mt', 'Malta', 'Valletta'],
      ['md', 'Mołdawia', 'Kiszyniów'], ['mc', 'Monako', 'Monako'], ['de', 'Niemcy', 'Berlin'],
      ['no', 'Norwegia', 'Oslo'], ['pl', 'Polska', 'Warszawa'], ['pt', 'Portugalia', 'Lizbona'],
      ['ru', 'Rosja', 'Moskwa'], ['ro', 'Rumunia', 'Bukareszt'], ['sm', 'San Marino', 'San Marino'],
      ['rs', 'Serbia', 'Belgrad'], ['sk', 'Słowacja', 'Bratysława'], ['si', 'Słowenia', 'Lublana'],
      ['ch', 'Szwajcaria', 'Berno'], ['se', 'Szwecja', 'Sztokholm'], ['ua', 'Ukraina', 'Kijów'],
      ['va', 'Watykan', 'Watykan'], ['hu', 'Węgry', 'Budapeszt'], ['gb', 'Wielka Brytania', 'Londyn'],
      ['it', 'Włochy', 'Rzym'],
    ],
    asia: [
      ['af', 'Afganistan', 'Kabul'], ['sa', 'Arabia Saudyjska', 'Rijad'], ['am', 'Armenia', 'Erywań'],
      ['az', 'Azerbejdżan', 'Baku'], ['bh', 'Bahrajn', 'Manama'], ['bd', 'Bangladesz', 'Dhaka'],
      ['bt', 'Bhutan', 'Thimphu'], ['bn', 'Brunei', 'Bandar Seri Begawan'], ['cn', 'Chiny', 'Pekin'],
      ['ph', 'Filipiny', 'Manila'], ['ge', 'Gruzja', 'Tbilisi'], ['in', 'Indie', 'Nowe Delhi'],
      ['id', 'Indonezja', 'Dżakarta'], ['iq', 'Irak', 'Bagdad'], ['ir', 'Iran', 'Teheran'],
      ['il', 'Izrael', 'Jerozolima'], ['jp', 'Japonia', 'Tokio'], ['ye', 'Jemen', 'Sana'],
      ['jo', 'Jordania', 'Amman'], ['kh', 'Kambodża', 'Phnom Penh'], ['qa', 'Katar', 'Doha'],
      ['kz', 'Kazachstan', 'Astana'], ['kg', 'Kirgistan', 'Biszkek'], ['kr', 'Korea Południowa', 'Seul'],
      ['kp', 'Korea Północna', 'Pjongjang'], ['kw', 'Kuwejt', 'Kuwejt'], ['la', 'Laos', 'Wientian'],
      ['lb', 'Liban', 'Bejrut'], ['mv', 'Malediwy', 'Male'], ['my', 'Malezja', 'Kuala Lumpur'],
      ['mm', 'Mjanma', 'Naypyidaw'], ['mn', 'Mongolia', 'Ułan Bator'], ['np', 'Nepal', 'Katmandu'],
      ['om', 'Oman', 'Maskat'], ['pk', 'Pakistan', 'Islamabad'], ['ps', 'Palestyna', 'Ramallah'],
      ['sg', 'Singapur', 'Singapur'], ['lk', 'Sri Lanka', 'Kolombo'], ['sy', 'Syria', 'Damaszek'],
      ['tj', 'Tadżykistan', 'Duszanbe'], ['th', 'Tajlandia', 'Bangkok'], ['tw', 'Tajwan', 'Tajpej'],
      ['tl', 'Timor Wschodni', 'Dili'], ['tr', 'Turcja', 'Ankara'], ['tm', 'Turkmenistan', 'Aszchabad'],
      ['uz', 'Uzbekistan', 'Taszkent'], ['vn', 'Wietnam', 'Hanoi'], ['ae', 'Zjednoczone Emiraty Arabskie', 'Abu Zabi'],
    ],
    africa: [
      ['dz', 'Algieria', 'Algier'], ['ao', 'Angola', 'Luanda'], ['bj', 'Benin', 'Porto-Novo'],
      ['bw', 'Botswana', 'Gaborone'], ['bf', 'Burkina Faso', 'Wagadugu'], ['bi', 'Burundi', 'Gitega'],
      ['td', 'Czad', 'Ndżamena'], ['cd', 'Demokratyczna Republika Konga', 'Kinszasa'], ['dj', 'Dżibuti', 'Dżibuti'],
      ['eg', 'Egipt', 'Kair'], ['er', 'Erytrea', 'Asmara'], ['sz', 'Eswatini', 'Mbabane'],
      ['et', 'Etiopia', 'Addis Abeba'], ['ga', 'Gabon', 'Libreville'], ['gm', 'Gambia', 'Bandżul'],
      ['gh', 'Ghana', 'Akra'], ['gn', 'Gwinea', 'Konakry'], ['gw', 'Gwinea Bissau', 'Bissau'],
      ['gq', 'Gwinea Równikowa', 'Malabo'], ['cm', 'Kamerun', 'Jaunde'], ['ke', 'Kenia', 'Nairobi'],
      ['km', 'Komory', 'Moroni'], ['cg', 'Kongo', 'Brazzaville'], ['ls', 'Lesotho', 'Maseru'],
      ['lr', 'Liberia', 'Monrovia'], ['ly', 'Libia', 'Trypolis'], ['mg', 'Madagaskar', 'Antananarywa'],
      ['mw', 'Malawi', 'Lilongwe'], ['ml', 'Mali', 'Bamako'], ['ma', 'Maroko', 'Rabat'],
      ['mr', 'Mauretania', 'Nawakszut'], ['mu', 'Mauritius', 'Port Louis'], ['mz', 'Mozambik', 'Maputo'],
      ['na', 'Namibia', 'Windhuk'], ['ne', 'Niger', 'Niamey'], ['ng', 'Nigeria', 'Abudża'],
      ['za', 'Republika Południowej Afryki', 'Pretoria'], ['cf', 'Republika Środkowoafrykańska', 'Bangi'],
      ['cv', 'Republika Zielonego Przylądka', 'Praja'], ['rw', 'Rwanda', 'Kigali'], ['sn', 'Senegal', 'Dakar'],
      ['sc', 'Seszele', 'Victoria'], ['sl', 'Sierra Leone', 'Freetown'], ['so', 'Somalia', 'Mogadiszu'],
      ['sd', 'Sudan', 'Chartum'], ['ss', 'Sudan Południowy', 'Dżuba'], ['tz', 'Tanzania', 'Dodoma'],
      ['tg', 'Togo', 'Lomé'], ['tn', 'Tunezja', 'Tunis'], ['ug', 'Uganda', 'Kampala'],
      ['ci', 'Wybrzeże Kości Słoniowej', 'Jamusukro'], ['st', 'Wyspy Świętego Tomasza i Książęca', 'São Tomé'],
      ['zm', 'Zambia', 'Lusaka'], ['zw', 'Zimbabwe', 'Harare'],
    ],
    namerica: [
      ['ag', 'Antigua i Barbuda', 'Saint John’s'], ['bs', 'Bahamy', 'Nassau'], ['bb', 'Barbados', 'Bridgetown'],
      ['bz', 'Belize', 'Belmopan'], ['dm', 'Dominika', 'Roseau'], ['do', 'Dominikana', 'Santo Domingo'],
      ['gd', 'Grenada', 'Saint George’s'], ['gt', 'Gwatemala', 'Gwatemala'], ['ht', 'Haiti', 'Port-au-Prince'],
      ['hn', 'Honduras', 'Tegucigalpa'], ['jm', 'Jamajka', 'Kingston'], ['ca', 'Kanada', 'Ottawa'],
      ['cr', 'Kostaryka', 'San José'], ['cu', 'Kuba', 'Hawana'], ['mx', 'Meksyk', 'Meksyk'],
      ['ni', 'Nikaragua', 'Managua'], ['pa', 'Panama', 'Panama'], ['kn', 'Saint Kitts i Nevis', 'Basseterre'],
      ['lc', 'Saint Lucia', 'Castries'], ['vc', 'Saint Vincent i Grenadyny', 'Kingstown'],
      ['sv', 'Salwador', 'San Salvador'], ['us', 'Stany Zjednoczone', 'Waszyngton'],
      ['tt', 'Trynidad i Tobago', 'Port of Spain'],
    ],
    samerica: [
      ['ar', 'Argentyna', 'Buenos Aires'], ['bo', 'Boliwia', 'Sucre'], ['br', 'Brazylia', 'Brasília'],
      ['cl', 'Chile', 'Santiago'], ['ec', 'Ekwador', 'Quito'], ['gy', 'Gujana', 'Georgetown'],
      ['co', 'Kolumbia', 'Bogota'], ['py', 'Paragwaj', 'Asunción'], ['pe', 'Peru', 'Lima'],
      ['sr', 'Surinam', 'Paramaribo'], ['uy', 'Urugwaj', 'Montevideo'], ['ve', 'Wenezuela', 'Caracas'],
    ],
    oceania: [
      ['au', 'Australia', 'Canberra'], ['fj', 'Fidżi', 'Suva'], ['ki', 'Kiribati', 'Tarawa Południowa'],
      ['fm', 'Mikronezja', 'Palikir'], ['nr', 'Nauru', 'Yaren'], ['nz', 'Nowa Zelandia', 'Wellington'],
      ['pw', 'Palau', 'Ngerulmud'], ['pg', 'Papua-Nowa Gwinea', 'Port Moresby'], ['ws', 'Samoa', 'Apia'],
      ['to', 'Tonga', 'Nuku’alofa'], ['tv', 'Tuvalu', 'Funafuti'], ['vu', 'Vanuatu', 'Port Vila'],
      ['mh', 'Wyspy Marshalla', 'Majuro'], ['sb', 'Wyspy Salomona', 'Honiara'],
    ],
  };

  const countries = Object.entries(raw).flatMap(([region, rows]) =>
    rows.map(([code, name, capital]) => ({ code, name, capital, region })));

  Q.data = Q.data || {};
  Q.data.regions = regions;
  Q.data.countries = countries;
})(window.Quizorama = window.Quizorama || {});
