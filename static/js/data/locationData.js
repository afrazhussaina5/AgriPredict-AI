// AgriPredict AI - India location selectors
// State/UT names are bundled for instant selection. Districts are loaded from
// a public India state/district dataset at runtime, with safe local fallbacks.

export const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export const LOCATION_DATA_URL =
  'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json';

export const FALLBACK_DISTRICTS = {
  'Andhra Pradesh': ['Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla', 'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Krishna', 'Kurnool', 'Markapuram', 'Nandyal', 'NTR', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'],
  'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
  'Ladakh': ['Kargil', 'Leh'],
  'Andaman and Nicobar Islands': ['Nicobars', 'North and Middle Andaman', 'South Andaman'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Lakshadweep': ['Agatti', 'Amini', 'Androth', 'Bitra', 'Chetlat', 'Kavaratti', 'Kadmat', 'Kalpeni', 'Kiltan', 'Minicoy'],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
};


// Dropdown-only mandi directory. It does not affect the analysis engine; it only
// gives the Preferred Mandi selector additional real market-yard choices when
// the live/cached government feed returns too few records.
export const MARKET_DIRECTORY = [
  { name: 'Kurnool Agricultural Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['onion','potato','tomato','chilli','groundnut','cotton'] },
  { name: 'Adoni Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['cotton','groundnut','onion','chilli','paddy'] },
  { name: 'Yemmiganur Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['cotton','groundnut','onion','paddy','maize'] },
  { name: 'Pattikonda Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['onion','groundnut','maize','paddy'] },
  { name: 'Alur Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['groundnut','cotton','onion','paddy'] },
  { name: 'Mantralayam Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['paddy','groundnut','cotton','chilli'] },
  { name: 'Dhone Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['groundnut','maize','onion','paddy'] },
  { name: 'Nandikotkur Market Yard', state: 'Andhra Pradesh', district: 'Kurnool', commodities: ['paddy','cotton','groundnut','chilli'] },
  { name: 'Guntur Mirchi Yard', state: 'Andhra Pradesh', district: 'Guntur', commodities: ['chilli','cotton','paddy','turmeric'] },
  { name: 'Vijayawada Market Yard', state: 'Andhra Pradesh', district: 'NTR', commodities: ['paddy','chilli','turmeric','maize','onion'] },
  { name: 'Kakinada Agricultural Market Yard', state: 'Andhra Pradesh', district: 'Kakinada', commodities: ['paddy','maize','groundnut','chilli'] },
  { name: 'Anakapalle Market Yard', state: 'Andhra Pradesh', district: 'Anakapalli', commodities: ['paddy','sugarcane','maize','turmeric'] },
  { name: 'Visakhapatnam Market Yard', state: 'Andhra Pradesh', district: 'Visakhapatnam', commodities: ['paddy','maize','onion','potato'] },
  { name: 'Hyderabad Bowenpally Wholesale Mandi', state: 'Telangana', district: 'Hyderabad', commodities: ['onion','tomato','potato','chilli','wheat','garlic','banana','apple'] },
  { name: 'Warangal Enamamula APMC Market', state: 'Telangana', district: 'Warangal', commodities: ['cotton','chilli','paddy','soybean','maize','turmeric'] },
  { name: 'Nashik APMC Mandi', state: 'Maharashtra', district: 'Nashik', commodities: ['onion','tomato','soybean','wheat','garlic'] },
  { name: 'Lasalgaon APMC Market', state: 'Maharashtra', district: 'Nashik', commodities: ['onion','garlic','tomato'] },
  { name: 'Azadpur Agricultural Produce Market', state: 'Delhi', district: 'North Delhi', commodities: ['onion','potato','tomato','apple','banana','garlic'] },
  { name: 'Kolar Agricultural Produce Market', state: 'Karnataka', district: 'Kolar', commodities: ['tomato','potato','onion','chilli'] },
  { name: 'Lasalgaon Onion Market', state: 'Maharashtra', district: 'Nashik', commodities: ['onion'] }
];
