window.NUMBERS_COURSE_DATA = {
    categoryId: 'numbers',
    lessons: [
        {
            id: 'numbers-01',
            title: '개수와 순서: 기수·서수',
            desc: '한국어의 하나와 첫째를 바탕으로 영어 숫자와 날짜·층수를 읽습니다.',
            concept: '한국어에서 “하나, 둘, 셋”은 몇 개인지 세는 말이고, “첫째, 둘째, 셋째”는 순서를 가리키는 말입니다. 영어도 개수에는 one, two, three 같은 기수를, 순서에는 first, second, third 같은 서수를 씁니다. 날짜의 일(day)과 건물의 층(floor)은 보통 서수로 읽어요. 다만 미국식 주소의 1층은 first floor, 영국식은 ground floor인 차이도 기억하세요.',
            examples: [
                { ko: '사과가 세 개 있어요.', en: 'I have three apples.', explanation: '사과의 개수를 말하므로 기수 three를 씁니다.' },
                { ko: '그녀는 경주에서 1등을 했어요.', en: 'She came in first in the race.', explanation: '순위는 순서를 나타내므로 서수 first를 씁니다.' },
                { ko: '오늘은 5월 12일이에요.', en: 'Today is May twelfth.', explanation: '날짜의 일은 보통 서수로 읽습니다.' },
                { ko: '우리 사무실은 8층에 있어요.', en: 'Our office is on the eighth floor.', explanation: '층수는 위치의 순서이므로 서수를 씁니다.' },
                { ko: '그는 세 번째 질문을 했어요.', en: 'He asked the third question.', explanation: '질문의 순서를 나타내는 third가 명사 앞에 옵니다.' },
                { ko: '테이블 위에 컵 두 개가 있어요.', en: 'There are two cups on the table.', explanation: '컵의 수량이므로 기수 two를 씁니다.' },
                { ko: '회의는 6월 1일에 시작해요.', en: 'The meeting starts on June first.', explanation: '월 뒤의 날짜 숫자는 first로 읽습니다.' },
                { ko: '오늘은 내 첫 출근 날이에요.', en: 'Today is my first day at work.', explanation: '처음이라는 순서를 first로 표현합니다.' },
                { ko: '버스에 학생 네 명이 탔어요.', en: 'Four students got on the bus.', explanation: '사람 수를 세는 말이라 기수 four를 씁니다.' },
                { ko: '그녀는 결승선을 두 번째로 통과했어요.', en: 'She crossed the finish line second.', explanation: '도착한 순서를 부사처럼 second로 나타냅니다.' }
            ]
        },
        {
            id: 'numbers-02',
            title: '가산·불가산: 명사의 테두리',
            desc: '눈에 보이는 형태와 테두리를 기준으로 셀 수 있는 명사를 구분합니다.',
            concept: '한국어 화자는 “물 한 개”보다 “물 한 병”이라고 말하죠. 물 자체에는 낱개의 테두리가 없기 때문입니다. 영어에서도 사과나 의자처럼 하나씩 경계가 뚜렷한 것은 a/an을 붙이고 복수형으로 셉니다. 물, 정보, 가구처럼 덩어리나 개념으로 보는 명사는 보통 직접 세지 않고 단수 취급해요. 같은 재료도 종류나 주문 단위로 보면 가산명사가 될 수 있습니다.',
            examples: [
                { ko: '책 한 권과 연필 두 자루가 필요해요.', en: 'I need a book and two pencils.', explanation: '책과 연필은 낱개 경계가 뚜렷해 직접 셉니다.' },
                { ko: '책상 위에 물이 조금 있어요.', en: 'There is some water on the desk.', explanation: '물은 덩어리로 보는 불가산명사라 단수 동사 is를 씁니다.' },
                { ko: '좋은 조언 하나 해 줄게요.', en: 'Let me give you a piece of good advice.', explanation: 'advice는 불가산이므로 piece라는 단위로 셉니다.' },
                { ko: '우리에게 새 정보가 필요해요.', en: 'We need some new information.', explanation: 'information은 직접 복수형으로 세지 않습니다.' },
                { ko: '창가에 의자 세 개가 있어요.', en: 'There are three chairs by the window.', explanation: 'chair는 개별 형태가 보여 복수형 chairs로 셉니다.' },
                { ko: '이 가구는 아주 튼튼해요.', en: 'This furniture is very sturdy.', explanation: 'furniture는 여러 가구를 묶어 부르는 불가산명사입니다.' },
                { ko: '그녀는 여행 가방 두 개를 샀어요.', en: 'She bought two suitcases.', explanation: 'suitcase는 경계가 분명한 개별 물건입니다.' },
                { ko: '아침에 커피를 마셨어요.', en: 'I had coffee in the morning.', explanation: '음료를 내용물로 말할 때 coffee는 보통 불가산입니다.' },
                { ko: '이 동네에는 작은 카페가 많아요.', en: 'There are many small cafes in this neighborhood.', explanation: '장소 하나하나를 뜻하는 cafe는 가산명사입니다.' },
                { ko: '그 소식은 나에게 큰 행복을 줬어요.', en: 'The news brought me great happiness.', explanation: 'news와 happiness는 형태가 없는 개념으로 불가산 취급합니다.' }
            ]
        },
        {
            id: 'numbers-03',
            title: '숫자를 세는 그릇과 단위',
            desc: '셀 수 없는 양에 컵·조각·장을 붙여 수량을 표현합니다.',
            concept: '물이나 종이처럼 직접 낱개로 세기 어려운 것에는 눈에 보이는 “그릇”을 붙이면 됩니다. 한국어의 물 한 컵, 종이 두 장과 같은 원리예요. 영어에서는 a cup of water, two sheets of paper처럼 단위가 앞에서 수를 받고, of 뒤에는 불가산명사가 옵니다. 단위가 복수이면 동사도 그 단위를 기준으로 복수형을 씁니다.',
            examples: [
                { ko: '물 한 컵을 주세요.', en: 'Please give me a cup of water.', explanation: 'cup이 셀 수 있는 단위이고 water는 불가산명사입니다.' },
                { ko: '종이 두 장을 인쇄했어요.', en: 'I printed two sheets of paper.', explanation: 'sheet가 수를 받으며 paper는 불가산으로 남습니다.' },
                { ko: '빵 한 조각 먹을래요?', en: 'Would you like a piece of bread?', explanation: 'bread 한 덩이를 piece라는 단위로 셉니다.' },
                { ko: '커피 두 잔을 주문했어요.', en: 'We ordered two cups of coffee.', explanation: 'cup이 복수이므로 ordered의 목적어가 두 잔입니다.' },
                { ko: '조언 세 가지를 적어 두세요.', en: 'Write down three pieces of advice.', explanation: 'advice 자체는 불가산이라 piece를 복수로 만듭니다.' },
                { ko: '치즈 한 조각을 더 먹었어요.', en: 'I had another slice of cheese.', explanation: 'slice는 얇게 자른 한 조각을 세는 단위입니다.' },
                { ko: '설탕 두 숟가락을 넣으세요.', en: 'Add two spoons of sugar.', explanation: 'spoon이 가산 단위이고 sugar는 불가산입니다.' },
                { ko: '초콜릿 한 판을 샀어요.', en: 'I bought a bar of chocolate.', explanation: 'bar는 막대 모양 한 개를 세는 단위입니다.' },
                { ko: '우유 한 병을 냉장고에 넣었어요.', en: 'I put a bottle of milk in the fridge.', explanation: 'bottle로 우유의 용기 수를 셉니다.' },
                { ko: '종이 세 장이 바닥에 떨어졌어요.', en: 'Three pieces of paper fell on the floor.', explanation: 'piece of paper도 종이의 개별 조각을 셀 수 있습니다.' }
            ]
        },
        {
            id: 'numbers-04',
            title: '수량 형용사: 많고 적음 말하기',
            desc: '가산·불가산 명사와 상황에 맞는 수량 표현을 고릅니다.',
            concept: '한국어의 “많은”은 셀 수 있는 사람·물건에도, 물·시간 같은 양에도 쓸 수 있지만 영어는 명사의 테두리를 따집니다. many와 few는 복수 가산명사에, much와 little은 불가산명사에 붙어요. some은 주로 긍정문, any는 질문과 부정문에서 쓰지만, 권유나 긍정적인 대답을 기대하는 질문에는 some도 자연스럽습니다.',
            examples: [
                { ko: '회의에 사람이 많이 왔어요.', en: 'Many people came to the meeting.', explanation: '사람은 셀 수 있는 복수 명사라 many를 씁니다.' },
                { ko: '물이 별로 남지 않았어요.', en: 'There is little water left.', explanation: 'water는 불가산명사라 little을 씁니다.' },
                { ko: '질문이 몇 개 있어요.', en: 'I have a few questions.', explanation: 'question은 가산명사이며 a few는 몇 개 있다는 긍정 의미입니다.' },
                { ko: '시간이 거의 없어요.', en: 'We have very little time.', explanation: 'time을 양으로 볼 때 불가산이므로 little을 씁니다.' },
                { ko: '사과 좀 사 왔어요.', en: 'I bought some apples.', explanation: '긍정문에서 복수 가산명사의 일부를 some으로 나타냅니다.' },
                { ko: '커피 좀 드릴까요?', en: 'Would you like some coffee?', explanation: '권유하는 질문에서는 긍정적인 대답을 기대해 some을 씁니다.' },
                { ko: '질문이 있나요?', en: 'Do you have any questions?', explanation: '일반적인 질문에서는 any가 자연스럽습니다.' },
                { ko: '오늘은 손님이 많지 않아요.', en: 'We do not have many customers today.', explanation: '부정문에서 복수 가산명사와 many를 씁니다.' },
                { ko: '설탕을 많이 넣지 마세요.', en: 'Do not add much sugar.', explanation: 'sugar는 불가산명사이고 부정문에서 much를 씁니다.' },
                { ko: '우유가 조금 있어요.', en: 'There is a little milk.', explanation: 'a little은 불가산 양이 조금 있다는 긍정 의미입니다.' }
            ]
        },
        {
            id: 'numbers-05',
            title: '분수·소수·비율·사칙연산',
            desc: '분자와 분모, 퍼센트와 계산식을 영어로 읽습니다.',
            concept: '분수는 한국어처럼 분자부터 말하고, 분모는 서수로 읽는 것이 기본입니다. 분자가 1보다 크면 분모에 s를 붙여요: one third, two thirds. 다만 1/2는 a half, 1/4는 a quarter라고 자주 말합니다. 소수점은 point, 퍼센트는 percent로 읽고, 계산은 plus, minus, times, divided by로 표현합니다.',
            examples: [
                { ko: '케이크의 절반을 먹었어요.', en: 'I ate half of the cake.', explanation: '1/2는 half라고 읽습니다.' },
                { ko: '학생의 3분의 2가 통과했어요.', en: 'Two thirds of the students passed.', explanation: '분자 two 뒤에 분모 third의 복수형 thirds를 씁니다.' },
                { ko: '컵의 4분의 1만 남았어요.', en: 'Only a quarter of the cup is left.', explanation: '1/4는 a quarter라고 읽을 수 있습니다.' },
                { ko: '온도는 영하 2.5도예요.', en: 'The temperature is minus two point five degrees.', explanation: '소수점은 point, 음수는 minus로 읽습니다.' },
                { ko: '가격이 10퍼센트 올랐어요.', en: 'The price went up by ten percent.', explanation: '비율 뒤에 percent를 붙이고 변화 폭은 by로 나타냅니다.' },
                { ko: '다섯 더하기 세 개는 여덟이에요.', en: 'Five plus three equals eight.', explanation: '더하기는 plus, 결과를 말할 때 equals를 씁니다.' },
                { ko: '열둘에서 넷을 빼면 여덟이에요.', en: 'Twelve minus four is eight.', explanation: '빼기는 minus로 읽습니다.' },
                { ko: '여섯 곱하기 일곱은 마흔둘이에요.', en: 'Six times seven equals forty-two.', explanation: '곱하기는 times라고 합니다.' },
                { ko: '스무 나누기 다섯은 넷이에요.', en: 'Twenty divided by five is four.', explanation: '나누기는 divided by로 표현합니다.' },
                { ko: '우리 팀의 남녀 비율은 2대 3이에요.', en: 'The ratio of men to women on our team is two to three.', explanation: '비율은 ratio of A to B 구조로 말하고 숫자를 to로 연결해 읽습니다.' }
            ]
        },
        {
            id: 'numbers-06',
            title: '돈 세기와 쇼핑·할인율',
            desc: '가격, 화폐 단위, 할인율과 영수증 숫자를 읽습니다.',
            concept: '가격을 말할 때는 숫자와 통화 단위를 함께 읽습니다. 달러와 센트처럼 단위가 둘이면 dollars and cents로 나누어 말할 수 있어요. “30% 할인”은 thirty percent off이고, 할인된 가격을 말할 때는 It is now...를 사용합니다. 영수증에서는 subtotal(소계), tax(세금), total(합계)를 구분해 최종 결제액을 확인하세요.',
            examples: [
                { ko: '이 셔츠는 25달러예요.', en: 'This shirt is twenty-five dollars.', explanation: '가격 숫자 뒤에 복수 단위 dollars를 붙입니다.' },
                { ko: '커피는 3달러 50센트예요.', en: 'The coffee is three dollars and fifty cents.', explanation: '달러와 센트를 각각 읽어 가격을 표현합니다.' },
                { ko: '이 재킷은 30퍼센트 할인 중이에요.', en: 'This jacket is thirty percent off.', explanation: '할인율은 percent off 순서로 말합니다.' },
                { ko: '할인 후에는 40달러예요.', en: 'It is forty dollars after the discount.', explanation: 'after the discount를 붙여 할인 후 가격임을 분명히 합니다.' },
                { ko: '원래 가격은 80달러였어요.', en: 'The original price was eighty dollars.', explanation: '할인 전 가격은 original price라고 합니다.' },
                { ko: '영수증 합계는 52달러 18센트예요.', en: 'The total on the receipt is fifty-two dollars and eighteen cents.', explanation: '영수증의 최종 합계는 total입니다.' },
                { ko: '세금은 4달러 20센트였어요.', en: 'The tax was four dollars and twenty cents.', explanation: 'tax는 세금 항목으로 금액과 함께 읽습니다.' },
                { ko: '두 개를 사면 하나는 반값이에요.', en: 'Buy two, and get the second one half off.', explanation: '두 번째 상품의 50% 할인을 half off로 나타냅니다.' },
                { ko: '제가 100달러를 드렸어요. 거스름돈은 얼마인가요?', en: 'I gave you one hundred dollars. How much change do I get?', explanation: '거스름돈은 change, 그 양은 how much로 묻습니다.' },
                { ko: '온라인 가격이 매장보다 15달러 저렴해요.', en: 'The online price is fifteen dollars cheaper than the in-store price.', explanation: '가격 차이는 숫자와 cheaper than으로 비교합니다.' }
            ]
        },
        {
            id: 'numbers-07',
            title: '날짜·시간·연도·전화번호·층수',
            desc: '일상에서 자주 만나는 숫자를 상황에 맞게 읽습니다.',
            concept: '숫자는 쓰임에 따라 읽는 방식이 달라집니다. 날짜의 일과 층수는 서수를 쓰고, 시간은 숫자를 그대로 읽거나 quarter past/to를 사용합니다. 연도는 두 자리씩 끊어 읽는 경우가 많고, 전화번호는 보통 숫자를 하나씩 읽으며 0은 zero 또는 oh라고 합니다. 주소의 층수는 나라별 표현 차이가 있으니 문맥을 확인하세요.',
            examples: [
                { ko: '제 생일은 9월 3일이에요.', en: 'My birthday is September third.', explanation: '날짜의 일은 서수 third로 읽습니다.' },
                { ko: '지금 7시 15분이에요.', en: "It's seven fifteen.", explanation: '시간은 시와 분을 이어 읽는 간단한 방식이 자연스럽습니다.' },
                { ko: '회의는 8시 45분에 시작해요.', en: 'The meeting starts at a quarter to nine.', explanation: 'a quarter to nine은 9시 15분 전, 즉 8시 45분입니다.' },
                { ko: '그녀는 1998년에 태어났어요.', en: 'She was born in nineteen ninety-eight.', explanation: '연도 1998은 보통 19와 98을 나누어 읽습니다.' },
                { ko: '제 전화번호는 415-208-6703이에요.', en: 'My phone number is four one five, two oh eight, six seven oh three.', explanation: '전화번호는 숫자를 하나씩 읽고 0은 oh라고도 합니다.' },
                { ko: '약국은 2층에 있어요.', en: 'The pharmacy is on the second floor.', explanation: '층수는 순서를 뜻하므로 서수 second를 씁니다.' },
                { ko: '기차는 오후 6시 30분에 출발해요.', en: 'The train leaves at six thirty p.m.', explanation: '오후임을 p.m.으로 밝혀 시간을 구분합니다.' },
                { ko: '오늘은 2026년 10월 12일이에요.', en: 'Today is October twelfth, twenty twenty-six.', explanation: '날짜의 일은 서수, 연도는 두 자리씩 나누어 읽습니다.' },
                { ko: '잠깐만요, 5분 후에 다시 전화할게요.', en: "Give me five minutes, and I'll call you back.", explanation: '분 단위는 기수 five로 셉니다.' },
                { ko: '우리 집 주소는 18번가 240호예요.', en: 'My address is 240 Eighteenth Street.', explanation: '주소 번호는 기수, 거리 이름의 순번은 서수 형태를 씁니다.' }
            ]
        },
        {
            id: 'numbers-08',
            title: '비즈니스·경제 뉴스의 큰 숫자',
            desc: 'Thousand, million, billion의 자릿수와 경제 지표를 이해합니다.',
            concept: '영어 큰 숫자는 thousand(천), million(백만), billion(십억) 단위로 세 자리씩 묶어 읽습니다. 한국어는 만·억 단위라 번역할 때 자릿수를 한 번 더 확인해야 해요. 예를 들어 1 million은 100만, 1 billion은 10억입니다. 숫자 뒤 단위는 정확한 수량을 말할 때 보통 단수형을 유지하며, 경제 뉴스에서는 revenue(매출), inflation(물가 상승률), rate(비율·금리)와 함께 읽습니다.',
            examples: [
                { ko: '그 회사는 지난해 3천만 달러를 벌었어요.', en: 'The company earned thirty million dollars last year.', explanation: '30 million은 3천만이며 million 자체에는 복수형 s를 붙이지 않습니다.' },
                { ko: '도시 인구는 약 250만 명이에요.', en: 'The city has a population of about 2.5 million.', explanation: '2.5 million은 250만입니다.' },
                { ko: '그 거래의 가치는 12억 달러예요.', en: 'The deal is worth 1.2 billion dollars.', explanation: '1.2 billion은 12억입니다.' },
                { ko: '정부는 도로에 4억 달러를 투자했어요.', en: 'The government invested four hundred million dollars in roads.', explanation: '400 million은 4억입니다.' },
                { ko: '회사의 매출은 8퍼센트 증가했어요.', en: 'The company’s revenue increased by eight percent.', explanation: '매출 증가 폭은 increased by와 퍼센트로 말합니다.' },
                { ko: '물가 상승률은 이번 달 2.3퍼센트예요.', en: 'The inflation rate is 2.3 percent this month.', explanation: '소수 비율은 point를 사용해 two point three percent로 읽습니다.' },
                { ko: '그 은행은 1조 달러가 넘는 자산을 보유해요.', en: 'The bank holds more than one trillion dollars in assets.', explanation: '미국식 영어의 trillion은 1조를 뜻합니다.' },
                { ko: '주식 가격은 6달러 40센트 하락했어요.', en: 'The stock price fell by six dollars and forty cents.', explanation: '하락 폭은 fell by 뒤에 금액을 말합니다.' },
                { ko: '이 지역의 국내총생산은 7,500억 달러예요.', en: 'The region’s GDP is seven hundred and fifty billion dollars.', explanation: '750 billion은 7,500억입니다.' },
                { ko: '지난 분기 수출액은 1,250억 달러에 도달했어요.', en: 'Exports reached 125 billion dollars last quarter.', explanation: '125 billion은 1,250억이며 reached로 도달한 수치를 표현합니다.' }
            ]
        }
    ]
};