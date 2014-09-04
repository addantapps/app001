'use strict';
//angular application 

var app = angular.module('app', ['ngRoute','ngAnimate','ngResource','ngTable','ngCookies','ngBootstrap'])
.config(function($routeProvider, $locationProvider, $httpProvider) {
    // Check if the user is connected
    var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){
        var deferred = $q.defer();  // Initialize a new promise
        $http.get('/loggedin').success(function(user){
            if (user !== '0') {
                $timeout(deferred.resolve, 0);
                $rootScope.audUser = user;
            }else {
                $rootScope.message = 'You need to log in.';
                $timeout(function(){deferred.reject();}, 0);
                $location.url('/login');
            }
        });
        return deferred.promise;
    };


    // Add an interceptor for AJAX errors
    $httpProvider.responseInterceptors.push(function($q, $location) {
        return function(promise) {
            return promise.then(
                function(response){
                    return response;
                }, 
                function(response) {
                    if (response.status === 401)
                        $location.url('/login');
                    return $q.reject(response);
                }
            );
        }
    });

    // Define all the routes
    $routeProvider.when('/', {
        templateUrl: '/views/admin.html',
        controller: 'LoginCtrl',
        resolve: {
            loggedin: checkLoggedin
        }
    })
    .when('/admin', {
        templateUrl: 'views/admin.html',
        controller: 'LoginCtrl',
        resolve: {
            loggedin: checkLoggedin
        }
    })
    .when('/sign-up', {
        templateUrl: 'views/sign-up.html',
        controller: 'SignUpCtrl',
    })
    .when('/card-holder', {
        templateUrl: 'views/card-holder.html',
        controller: 'SignUpCtrl',
    })
    .when('/vehicle-info', {
        templateUrl: 'views/vehicle-info.html',
        controller: 'SignUpCtrl',
    })
    .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl'
    })

    .when('/password-change/:validation_key', {
        templateUrl: 'views/password-change.html',
        controller: 'LoginCtrl'
    })

    .when('/data-submit', {
        templateUrl: 'views/data-submit.html',
        controller: 'DocumentUploadCtrl',
    })

    .when('/validate-user-email/:validation_key', {
        templateUrl: 'views/validate-user-email.html',
        controller: 'SignUpCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });
}) // end of config()
.run(function($rootScope, $http){
    $rootScope.message = '';
    $rootScope.subscriber = {};
    $rootScope.viewFileURL = "http://iis.sharptech.eu:8007/";
    // Logout function is available in any pages
    $rootScope.logout = function(){
        $http.post('/logout');
    };
});

/**********************************************************************
* Login controller
**********************************************************************/
app.controller('LoginCtrl', function($scope, $rootScope, $http, $location, $routeParams,$timeout,$cookies) {
    // This object will be filled by the form
    $scope.user = {};
    $scope.success = false;
    $scope.login = function(){  
        $http.post('/login', { 
            username: $scope.user.username,
            password: $scope.user.password, 
            rememberme: $scope.user.rememberme,
        })
        .success(function(user){ 
            $location.url('/admin');
        })
        .error(function(data){
            if(data.user){
                $cookies.unApprUser = JSON.stringify(data.user);
                $location.url('/data-submit');
            } else {
                $rootScope.message = 'Authentication failed! Invalid user name or password.';
                $scope.show_alert = true;
                $timeout(function(){ $scope.show_alert = false;}, 3000);
                $location.url('/login');
            }    
        });
    };

    $scope.forgetPassword = function(){
        $scope.disableEmail = true;
        $http.post('/forget-password', {
            femail: $scope.user.femail,
        })
        .success(function(user){
            $rootScope.message = 'A verification email has been send to your email id. Please click on the verification link to change your password change.';
            $scope.success = $scope.show_alert = true;
            $timeout(function(){ $scope.success = $scope.show_alert = false}, 4000);
            $scope.show = false;           
        })
        .error(function(data, status){
            if(status == 303) { 
                $rootScope.message = 'Invalid Email/User account!';
            } else {
                $rootScope.message = "Error! Please try again."
            }
            $scope.show_alert = true;
            $scope.disableEmail = false;
            $timeout(function(){ $scope.show_alert = false}, 4000);    
        });
    }

    $scope.changePassword = function(isValid){
        $scope.formSubmitted = true;
        if (!isValid) return 0;
        $http.post('/change-password', {
            npassword: $scope.user.password,
            validation_key : $routeParams.validation_key
        })
        .success(function(user){
            $scope.success = $scope.show_alert = true;
            $timeout(function(){ $scope.success = $scope.show_alert = false}, 4000);
            $rootScope.message = 'Your password has been changed successfully. ';                
        })
        .error(function(data){
            $rootScope.message = "Error! Your password cannot be changed.";
            $scope.show_alert = true;
            $timeout(function(){ $scope.show_alert = false}, 4000);   
        });

    }

});


//;http://lostechies.com/gabrielschenker/2013/12/12/angularjspart-4-accessing-server-side-resources/
//https://vickev.com/#!/article/authentication-in-single-page-applications-node-js-passportjs-angularjs
//http://mrbool.com/directives-events-introduction-to-angular-js-course-part-17/30990

app.factory("subscriberData", function(){
    return {subscriber: { } }
});

/**********************************************************************
* Signup controller
**********************************************************************/
app.controller('SignUpCtrl', function($scope, $http, $location, $routeParams, subscriberData) {
// List of users got from the server
    $scope.listData = [];
    $scope.isFormSubmit = false;
    $scope.subscriber = subscriberData.subscriber;

    $scope.loadLocataire = function(){
        $http.get('/get-locataire')
        .success(function(data){
            $scope.locataire = data;
        }).error(function(){
            $scope.locataire = {};
        });
    }

    $scope.validateUserEmail = function(){
        $scope.isLoading = true;
        $scope.ifValidated =  $scope.ifError  = false
        $http.get('/validate-email-key/'+$routeParams.validation_key)
        .success(function(){
            $scope.ifValidated = true;
            $scope.isLoading = false;
        }).error(function(){
            $scope.ifError = true;
            $scope.isLoading = false;
        });
    }

    $scope.submitSignupFormUserAcount = function(isValid) {
        $scope.signupFormSubmitted = true;
        if (isValid) { 
            $location.url('/card-holder');
        }

    };

    $scope.submitHolderForm = function(isValid) {
        $scope.holderFormSubmitted = true;
        if (isValid) {
            $location.url('/vehicle-info');
        }  
    };   

    $scope.submitVehicleInfoForm = function(isValid) {
        $scope.signupFormSubmitted = true;
        if (isValid) {
            $http.post('/subscriber-signup', $scope.subscriber )
            .success(function(data){
                $scope.message = 'Subsciber has been registered successfully!';
                $("#vehicleInfoForm").hide();
               
                $(".jumbotron-own").fadeIn(); 
            })
            .error(function(){
                $scope.message = "Couldn't create the subscriber. Please try again later";
                $("#vehicleInfoForm").hide();
                $(".alert").fadeIn();  
            });
        }
    }

});

/**********************************************************************
* DashboardCtrl controller
**********************************************************************/
app.controller('DashboardCtrl', function($scope, $http, $location, $routeParams,$rootScope, ngTableParams) {

    $scope.parkingTransactions = [];
    $scope.parkingTransactionsTable = new ngTableParams({ page: 1,  count:5 }, {
        total: $scope.parkingTransactions.length, // length of data
        getData: function($defer, params) {
            $defer.resolve($scope.parkingTransactions.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        },
        $scope: { $data: {} }
    });

    $scope.loadparkingTransactions = function(daterange){
        var tURL = daterange ? "?dateRange="+daterange : "";
        $http.get('/parking-transactions'+tURL).success(function(data){
            $scope.parkingTransactions = data;
            $scope.parkingTransactionsTable.reload();
            if(!daterange) {
                $scope.DateRangeParkingTrans = {
                    endDate: moment(),
                    startDate:moment(data[0].ADate)
                };
            }    
            $scope.filterParkingTrans = function(){
                var dateRange = $scope.DateRangeParkingTrans.startDate.format("DD-MM-YYYY")+","+$scope.DateRangeParkingTrans.endDate.format("DD-MM-YYYY");
                $scope.loadparkingTransactions(dateRange);
            }  
        })
    } 

    $scope.cardOperations = [];
    $scope.cardOperationsTable = new ngTableParams({ page: 1,  count:5 }, {
        total: $scope.cardOperations.length, // length of data
        getData: function($defer, params) {
            $defer.resolve($scope.cardOperations.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        },
        $scope: { $data: {} }
    });

    $scope.loadCardOperations = function(daterange){
        var tURL = daterange ? "?dateRange="+daterange : "";
        $http.get('/card-operations'+tURL).success(function(data){
            $scope.cardOperations = data;
            $scope.cardOperationsTable.reload();
            if(!daterange) {
                $scope.DateCardOperation = {
                    endDate: moment(),
                    startDate:moment(data[0].TDate)
                };
            }   
            $scope.filterCardOperation = function(){  
                var dateRange = $scope.DateCardOperation.startDate.format("DD-MM-YYYY")+","+$scope.DateCardOperation.endDate.format("DD-MM-YYYY");
                $scope.loadCardOperations(dateRange);
            }  
        })
    }   
    $scope.loadDashboardData = function(){
        $http.get('/subscriber-zone').success(function(data){
            $rootScope.subscriber_zone = data;
         })
        $http.get('/dashboard-data').success(function(data){
            $scope.dashboardData = data;
        })
        $scope.loadparkingTransactions();
        $scope.loadCardOperations();
    } 
});   


/**********************************************************************
* DocumentUploadCtrl controller
**********************************************************************/
app.controller('DocumentUploadCtrl', function($scope, $http,ngTableParams, $rootScope,$location,$cookies,$timeout){
    //------------Document uploaded table functions/variables--------| 
    $scope.tabledata = []; 
    $scope.tableParams = new ngTableParams({ page: 1,  count:3 }, {
        total: $scope.tabledata.length,  
        getData: function($defer, params) {
            $defer.resolve($scope.tabledata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        },
        $scope: { $data: {} }            
    });

    $scope.loadDocuments = function(){
        $http.get('/subscriber-documents/'+$rootScope.unApprUser.SubscriberID).success(function(data){  
            $scope.tabledata = data;
            $scope.tableParams.reload();
        })
    }

    //------------Zonal Attachment Table functions -----------------|
    $scope.zoneData = []; 
    $scope.tableZoneParams = new ngTableParams({ page: 1,  count:3 }, {
        total: $scope.zoneData.length, // length of data
        getData: function($defer, params) {
            $defer.resolve($scope.zoneData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        },
        $scope: { $data: {} }      
    });    

    $scope.loadZoneData = function(){
        $http.get('/attached-zones/'+$rootScope.unApprUser.SubscriberID).success(function(data){ console.log(data);
            $scope.zoneData = data;
            $scope.tableZoneParams.reload();
        })
    }  

    $scope.initUploadForm = function(){ 
        if($cookies.unApprUser === 'null'||$cookies.unApprUser === undefined ){  
            $location.url('/login');
        } else {
            $rootScope.unApprUser = JSON.parse($cookies.unApprUser);
            $http.get('/subscriber-type').success(function(data){
                $rootScope.subscriber_types = data;
            })
            $http.get('/subscriber-document-type').success(function(data){
                $rootScope.subscriber_document_types = data;
            })
            $http.get('/subscriber-zone').success(function(data){
                $rootScope.subscriber_zone = data;
            })
            $scope.loadDocuments();
            $scope.loadZoneData();
        }
    }; 
    
    $scope.logout = function(){
        $cookies.unApprUser = 'null';
        $location.url('/login');
    }

    $scope.deleteZone = function(zoneId,$event ){
        var clickedEl = $event.target;
        if($(clickedEl).html() == 'Confirm') {
            $http.post('/delete-zone', { 'zoneId' : zoneId } )
                .success(function(data){
                     $scope.loadZoneData();
                })
                .error(function(){
                  
            });
        } else {
            $(clickedEl).html('Confirm').addClass("confirm");
        }       
    }

    $scope.deleteDocument = function(documentId,$event ){
        var clickedEl = $event.target;
        if($(clickedEl).html() == 'Confirm') {
            $http.post('/delete-document', { 'documentId' : documentId } )
                .success(function(data){
                     $scope.loadDocuments();
                })
                .error(function(){
                  
                });
        } else {
            $(clickedEl).html('Confirm').addClass("confirm");
        }        
    }

    $scope.changeConfirmText = function(){
       $(".confirm").html('x').removeClass("confirm");
    }

    $scope.loadDocumentType = function(){
        $scope.document_types = $objeq($scope.subscriber_document_types, "ParkingFeeTypeID == "+$scope.subscriberType.ParkingFeeTypeID)
    }

    $scope.uploadFile = function(isValid){
        $scope.uploadFormSubmitted = true;
        if($scope.myFile.size > (1024 * 1024)){
            isValid = false;
            $scope.file_size_invalid = true;
        }
        if(isValid){
            $scope.file_size_invalid = false; 
            $scope.isFormSubmit = false;
            var file = $scope.myFile;
            var params =  "subscriberID="+$rootScope.unApprUser.SubscriberID+"&subdcriberType="+$scope.subscriberType.ParkingFeeTypeID+"&DocumentType="+$scope.DocumentType.SubscriberDocumentTypeID;
            var uploadUrl = "/fileUpload?"+params;
            var fd = new FormData();
            fd.append('uploadfile', file);
            $rootScope.topMessage = "Uploading file..";
            $http.post(uploadUrl, fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }) .success(function(){
                $rootScope.topMessage = false;
                $scope.loadDocuments();
            }).error(function(){ });    
        }  
    };

    $scope.assignZone = function(isValid){
        $scope.zoneFormSubmitted = true;
        var isMultizoneEnabled = $objeq($scope.subscriber_types, "ParkingFeeTypeID == "+$scope.subscriberType.ParkingFeeTypeID+" -> IsMultiZoneEnabled")[0];
        if(!isMultizoneEnabled && $scope.zoneData.length > 0){
            isValid = false;
            $rootScope.message = 'The selected Subscriber Type cannot allow you to attach multiple zones!'; 
            $scope.show_alert = true;
            $timeout(function(){   $scope.show_alert = false}, 3000);
        }
        if(isValid){ 
           $http.post('/attach-zone', {
                subscriberID : $rootScope.unApprUser.SubscriberID,
                subscriberZone : $scope.subdcriberZone.ZoneID,
                subdcriberType : $scope.subscriberType.ParkingFeeTypeID
           } )
            .success(function(data){
                $scope.loadZoneData();
            })
            .error(function(){
               
            });
        }  
    }

    $scope.submitDataUpload = function(){
        if($scope.tabledata.length > 0) {
            $rootScope.message = 'Uploaded documents have been submitted successfully for your account approval.'; 
            $scope.success = $scope.show_alert = true;
            $timeout(function(){ $scope.success = $scope.show_alert = false}, 3000);
         } else {
            $rootScope.message = 'No files uploaded! Please upload any files to submit your documents'; 
            $scope.show_alert = true;
            $timeout(function(){   $scope.show_alert = false}, 3000);
         }            
    }
    
});

app.filter('type_string', function($rootScope) {
    return function(type_id, return_type) {
        var out = "";
        if(type_id) {
            var docType = $objeq($rootScope.subscriber_document_types, "SubscriberDocumentTypeID == "+type_id);
            if(return_type == "document")
                var out = docType[0].DocumentTypeName;
            else if(return_type == "subscriber")
                var out =  $objeq($rootScope.subscriber_types, "ParkingFeeTypeID == "+docType[0].ParkingFeeTypeID+" -> Designation")[0];
            else if(return_type == "zone")
                var out =  $objeq($rootScope.subscriber_zone, "ZoneID == "+type_id+" -> Name")[0];
        }    
        return out;
    };
})

app.directive('ngUnique', ['$http', function (async) {
    return {
        require: 'ngModel',
        restrict: 'A',
        link: function(scope, elem, attrs, ctrl) {
            elem.on('blur', function (evt) {
                scope.$apply(function () {                   
                    var val = elem.val(); 
                    var ajaxConfiguration = { method: 'POST', url: '/validate-user-email/', data:{email: ctrl.$modelValue}};
                    async(ajaxConfiguration)
                    .success(function(data, status, headers, config) {     
                        ctrl.$setValidity('unique',true);
                    }).error(function(data, status, headers, config) {
                        ctrl.$setValidity('unique',false);
                    });
                });
            });
        }
    };
}]);

app.directive('pdfimageonly', function () {
    return {
        require: 'ngModel',
        restrict: 'A',
        link: function(scope, elem, attrs, ctrl) {
            elem.on('change', function (evt) { 
                var acceptFileTypes =  /\.(gif|jpg|JPEG|tiff|png|pdf)$/i;
                var filename = elem.val(); 
                scope.$apply(function () {                   
                    if(acceptFileTypes.test(filename))
                         ctrl.$setValidity('filetype',true); 
                    else 
                         ctrl.$setValidity('filetype',false);                            
                });
            });
        }
    };
});

app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);




app.directive('filecheck', function () {
    return { 
        require:'ngModel',
        link:function(scope,el,attrs,ngModel){
      el.bind('change',function(){ 
        scope.$apply(function(){
          ngModel.$setViewValue(el.val());
          ngModel.$render();
        });
      });
    }
  }
});

app.directive('showtab', function () {
    return { link: function (scope, element, attrs) {   
        element.click(function(e) {
            e.preventDefault();
            $(element).tab('show');
        }); }
    };
})

app.directive('clickAnywhereButHere', function($document){
  return {
    restrict: 'A',
    link: function(scope, elem, attr, ctrl) {
      elem.bind('click', function(e) {
        e.stopPropagation();
      });
      $document.bind('click', function() {
        scope.$apply(attr.clickAnywhereButHere);
      })
    }
  }
})