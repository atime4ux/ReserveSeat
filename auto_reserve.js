await(async () => {
    //예약정보
    const autoPayment = false;//저동결제 진행 여부
    const rBirth = "yyMMdd";
    const rHp1 = "010";
    const rHp2 = "1234";
    const rHp3 = "4856";
    const rEmail = "emailAddress@company.com";
    const rCar = "123가4567";
    const objCheckUrl = {
        date: "yyMMdd",
        //매번 새로운 url 입력할것
        url: "https://travelReservationSite/getAvailSeat",
        urlType: "iframe"
    };

    //예약 사이트 정보
    const intervalTime = 750;
    const companyName = "where to go";
    const companyUrl = "https://travelReservationSite/landmarkId";

    //파싱 및 예약 처리
    const parseSeatMapHtml = (strHtml) => {
        let result = "E";
        if (strHtml.indexOf(".stySeat") > 0) {
            if (strHtml.indexOf("\"stySeat\"") > 0 || strHtml.indexOf("'stySeat'") > 0) {
                result = "Y";
            }
            else {
                result = "N";
            }
        }

        return result;
    };
    let iframeLoadFlag = 0;//iframe 로딩 완려 여부 확인용
    const fnReserveSeat = async () => {
        const getIframeDoc = (iframeId) => {
            return document.getElementById(iframeId).contentWindow.document;
        };

        getIframeDoc("ifrmSeat").getElementById("Map").firstElementChild.click();

        const reserveSeatResult = await intervalPromise(() => {
            let res = "N";

            //iframe 로딩 확인
            if (iframeLoadFlag == 1) {
                const availSeat = getIframeDoc("ifrmSeat").getElementsByClassName("stySeat");
                if (availSeat.length > 0) {
                    //시트 선택 후 다음
                    availSeat[0].click();
                    getIframeDoc("ifrmSeat").getElementById("NextStepImage").click();
                    res = "Y";
                }
                else {
                    //자리 사라짐
                    console.log("disapeared seat");
                    res = "E";
                }
            }

            return res;
        }, 100);

        if (reserveSeatResult == "Y" && autoPayment == true) {
            //10초 대기 후 첫번째 할인 선택
            console.log("select discount - waiting 10 seconds", (new Date()).toLocaleString());
            await timerPromise(() => {
                getIframeDoc("ifrmBookStep").querySelectorAll("input[name='PriceType']")[0].click();
            }, 10000);

            //10초 대기 후 다음 버튼 클릭
            console.log("next button - waiting 10 seconds", (new Date()).toLocaleString());
            await timerPromise(() => {
                getIframeDoc("ifrmBookStep").getElementById("NextStepImage").click();
            }, 10000);

            //10초 대기 후 이용약관 동의 클릭
            console.log("agree button - waiting 10 seconds", (new Date()).toLocaleString());
            await timerPromise(() => {
                getIframeDoc("ifrmBookCertify").getElementById("Agree").click();//체크
                getIframeDoc("ifrmBookCertify").getElementsByClassName("inforbtn")[0].childElements()[0].click();//저장
            }, 10000);

            //10초 대기 후 다음 버튼 클릭
            console.log("next button - waiting 10 seconds", (new Date()).toLocaleString());
            await timerPromise(() => {
                getIframeDoc("ifrmBookStep").getElementById("NextStepImage").click();
            }, 10000);

            //10초 대기 후 예약정보 입력
            console.log("input reserve info - waiting 10 seconds", (new Date()).toLocaleString());
            await timerPromise(() => {
                getIframeDoc("ifrmBookStep").getElementById("YYMMDD").value = rBirth;
                getIframeDoc("ifrmBookStep").getElementById("HpNo1").value = rHp1;
                getIframeDoc("ifrmBookStep").getElementById("HpNo2").value = rHp2;
                getIframeDoc("ifrmBookStep").getElementById("HpNo3").value = rHp3;
                getIframeDoc("ifrmBookStep").getElementById("Email").value = rEmail;
                getIframeDoc("ifrmBookStep").getElementById("CustomEtc").value = rCar;

                const arrPaymentRadio = getIframeDoc("ifrmBookStep").querySelectorAll("input[name='Payment']");
                arrPaymentRadio[arrPaymentRadio.length - 1].click();//무통장 입금

                getIframeDoc("ifrmBookStep").getElementById("BankCode").value = "38057";//기업은행

                getIframeDoc("ifrmBookStep").getElementById("NextStepImage").click();//다음 버튼
            }, 10000);

            //10초 대기 후 결제하기 버튼 클릭
            console.log("payment button - waiting 10 seconds", (new Date()).toLocaleString());
            await timerPromise(() => {
                getIframeDoc("ifrmBookStep").getElementById("checkAll").click();
                getIframeDoc("ifrmBookStep").getElementById("NextStepImage").click();//결제하기 버튼
            }, 10000);
        }
        else if (reserveSeatResult == "E") {
            var msg = "seat disapeared - run interval again";
            console.log(msg, (new Date()).toLocaleString());
            AlertSlack(msg);

            //초기화면으로 이동 후 인터벌 실행
            $(".btn_map").click();
            intervalIdx = 0;
        }
    };


    //공통 로직
    Notification.requestPermission();

    Date.prototype.ToString = function (dateFormat) {
        if (dateFormat == undefined || dateFormat == null || dateFormat.trim().length == 0) {
            return this.toString();
        }
        else {
            const padZero = function (a) {
                return (a > 9 ? '' : '0') + a.toString();
            }

            const yyyy = this.getFullYear();
            const MM = padZero(this.getMonth() + 1);
            const dd = padZero(this.getDate());

            const HH = padZero(this.getHours());
            const hh = padZero(HH > 12 ? (HH - 12) : HH);
            const mm = padZero(this.getMinutes());
            const ss = padZero(this.getSeconds());

            return dateFormat.split("yyyy").join(yyyy)
                .split("MM").join(MM)
                .split("dd").join(dd)
                .split("HH").join(HH)
                .split("hh").join(hh)
                .split("mm").join(mm)
                .split("ss").join(ss);
        }
    }

    const intervalPromise = (fn, ms, fnIntervalIdxSetter) => {
        return new Promise((resolve, reject) => {
            const timerId = setInterval(() => {
                const res = fn();
                if (res == "Y" || res == "E") {
                    clearTimeout(timerId);
                    resolve(res);
                }
            }, ms);

            if (fnIntervalIdxSetter != undefined) {
                fnIntervalIdxSetter(timerId);
            }
        });
    };
    const timerPromise = (fn, ms) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const res = fn();
                resolve(res);
            }, ms);
        });
    };

    let $my;
    const includeJquery = async () => {
        const jq = document.createElement('script');
        jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js";
        document.getElementsByTagName('head')[0].appendChild(jq);

        console.log("include jquery - waiting 2 seconds", (new Date()).toLocaleString());
        await timerPromise(() => { }, 2000);

        return jQuery.noConflict();
    };

    const AlertNoti = (msg, url) => {
        try {
            const noti = new Notification(companyName, { body: msg });
            if ((url ?? "").length > 0) {
                noti.onclick = (e) => {
                    e.preventDefault(); // prevent the browser from focusing the Notification's tab
                    window.open(url, '_blank');
                };
            }
        }
        catch (err) {
        }
    };
    const AlertSlack = (msg, url) => {
        try {
            const webhookUrl = 'web hook url';
            const objMsg = { text: `${msg}` };
            if ((url ?? "").length > 0) {
                objMsg.text += `\r\n<${url}|여기를 클릭>`;
            }
            $my.ajax({
                type: "POST",
                url: webhookUrl,
                data: JSON.stringify(objMsg)
            });
        }
        catch (err) {
        }
    };

    let intervalIdx = 0;
    let intervalCnt = 0;
    let intervalErrCnt = 0;
    let intervalCheckCnt = 0;
    let intervalCheckTime = new Date();
    const fnInterval = async (objCheckUrl) => {
        intervalCnt++;

        const intervalDuration = (new Date()) - intervalCheckTime;
        const cntPerSec = (intervalCnt - intervalCheckCnt) / (intervalDuration / 1000);

        if (intervalCnt % 10 == 0 && intervalErrCnt == 0) {
            console.clear();

            if (intervalCnt > 0 && intervalCnt % 100 == 0) {
                console.log(`interval runnning ${cntPerSec.toFixed(2)} per second`);

                //초기화
                intervalCnt = 1;
                intervalCheckCnt = 0;
                intervalCheckTime = new Date();
            }
        }

        const targetDate = objCheckUrl.date;
        const url = objCheckUrl.url;

        let res = "";
        try {
            res = await $my.get(url);
        }
        catch (err) {
            console.error(err);
        }

        const parseHtmlResult = parseSeatMapHtml(res);
        if (parseHtmlResult == "E") {
            //오류 발생
            //clearInterval(intervalIdx);
            intervalErrCnt++;

            const alertMsg = `${targetDate} ${companyName} error`;
            console.log(alertMsg);

            if (intervalErrCnt < 10) {
                //쉬고 재시도
                console.log("wait retry for 3 minutes", (new Date()).toLocaleString());
                await timerPromise(() => { }, 3 * 60 * 1000);
            }
            else {
                //재시도 횟수 넘으면 반복 종료
                intervalIdx++;

                AlertNoti(alertMsg);
                AlertSlack(alertMsg);
            }
        }
        else {
            //오류 카운트 초기화
            intervalErrCnt = 0;

            if (parseHtmlResult == "Y") {
                //clearInterval(intervalIdx);
                intervalIdx++;

                const alertMsg = `${targetDate} ${companyName} found seat`;
                const alertUrl = companyUrl;
                console.log(alertMsg);
                AlertNoti(alertMsg, alertUrl);
                AlertSlack(alertMsg, alertUrl);

                await fnReserveSeat();
            }
            else if (parseHtmlResult == "N") {
                console.log(`${targetDate} full(${(new Date()).toLocaleString()}, ${cntPerSec.toFixed(2)} per sec)`);
            }
        }
    };

    Notification.requestPermission();

    if ($ == undefined || $.get == undefined || $.ajax == undefined) {
        $my = await includeJquery();
    }
    else {
        $my = $;
    }

    fnBookNoticeShowHide('');//공지사항 제거

    //iframe 로딩 확인용
    const objIframe = document.getElementById('ifrmSeat');
    if (objIframe != undefined) {
        objIframe.addEventListener("load", () => { iframeLoadFlag++; }, false);
    }

    //2초 대기
    console.log("interval will run after 2 seconds", (new Date()).toLocaleString());
    await timerPromise(() => { }, 2000);

    if (false) {
        //인터벌 사용
        intervalPromise(() => {
            $my("#divBookMain img:first").attr("title", (new Date()).getMilliseconds());
            fnInterval(objCheckUrl);//내부에서 인터벌 종료
        }, intervalTime, (idx) => {
            intervalIdx = idx;
        });
    }
    else {
        //while 사용 -> 싱글처리
        const curPageTitle = document.title;
        while (intervalIdx == 0) {
            document.title = `${curPageTitle}_${(new Date()).ToString("yyyyMMdd_HHmmss")}`;
            await fnInterval(objCheckUrl);//내부에서 인터벌 종료
            await timerPromise(() => { }, intervalTime);
        }
    }
})();