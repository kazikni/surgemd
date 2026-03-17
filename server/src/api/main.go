package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	api "surgemd.io/module/api"
)

func main() {
	config, err := api.LoadConfig("../config.json")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	apiServer, err := api.NewApiServer(config.Database.Files.Accounts, config)
	if err != nil {
		log.Fatalf("Failed to start API server: %v", err)
	}

	apiServer.HandleFunctions()

	addr := fmt.Sprintf(":%d", config.API.Host.Port)
	log.Printf("API server listening on %s", addr)

	if config.API.Host.HTTPS {
		if config.API.Host.CertFile == "" || config.API.Host.KeyFile == "" {
			log.Fatal("HTTPS enabled but no cert_file or key_file specified in config")
		}

		cert, err := tls.LoadX509KeyPair(config.API.Host.CertFile, config.API.Host.KeyFile)
		if err != nil {
			log.Fatalf("Failed to load cert/key pair: %v", err)
		}

		caCertPool := x509.NewCertPool()
		if config.API.Host.CAFile != "" {
			caCertBytes, err := ioutil.ReadFile(config.API.Host.CAFile)
			if err != nil {
				log.Fatalf("Failed to read CA file: %v", err)
			}
			if ok := caCertPool.AppendCertsFromPEM(caCertBytes); !ok {
				log.Fatal("Failed to append CA certs")
			}
		}

		tlsConfig := &tls.Config{
			Certificates: []tls.Certificate{cert},
			ClientCAs:    caCertPool,
		}

		server := &http.Server{
			Addr:      addr,
			Handler:   nil,
			TLSConfig: tlsConfig,
		}

		log.Fatal(server.ListenAndServeTLS("", ""))
	} else {
		log.Fatal(http.ListenAndServe(addr, nil))
	}
}
