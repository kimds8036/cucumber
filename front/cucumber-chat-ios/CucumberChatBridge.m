#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CucumberNativeChat, NSObject)

RCT_EXTERN_METHOD(open:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
